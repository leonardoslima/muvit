import type { workoutPlanFullSchema } from '@muvit/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { z } from 'zod';
import {
  type GuidedSession,
  type GuidedSessionSummary,
  buildSessionSummary,
  completeCurrentSet,
  continueAfterExercise,
  createGuidedSession,
  extendRest,
  markSessionFinished,
  pauseGuidedSession,
  resumeGuidedSession,
  skipRest,
  updateCurrentSet,
} from '../application/workouts/guided-session';
import { loadWorkoutDay, normalizeCachedTodayWorkout } from '../application/workouts/today-workout';
import { finishWorkoutWithOfflineFallback } from '../application/workouts/workout-log';
import type { ApiClient } from './api';
import { isoDateFromTimestamp, todayIsoDate } from './date';
import { createWorkoutLogJournal } from './log-queue';
import { type WorkoutSessionStorage, createWorkoutSessionStorage } from './workout-session-storage';

export type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
export type WorkoutDay = WorkoutPlan['days'][number];
export type GuidedWorkoutState = 'loading' | 'error' | 'ready' | 'completed';

type GuidedWorkoutInput = {
  api: ApiClient;
  authUserId?: string;
  dayId?: string;
  storage?: WorkoutSessionStorage;
  now?: () => number;
};

export type GuidedWorkoutController = {
  state: GuidedWorkoutState;
  day: WorkoutDay | null;
  session: GuidedSession | null;
  error: Error | null;
  actionError: string | null;
  canRetryFinish: boolean;
  storageError: string | null;
  queued: boolean;
  busy: boolean;
  draftActive: boolean;
  summary: GuidedSessionSummary | null;
  updateSet: (values: { loadKg?: string; repsDone?: string }) => Promise<void>;
  completeSet: () => Promise<void>;
  addRestTime: () => Promise<void>;
  skipRest: () => Promise<void>;
  continueAfterExercise: () => Promise<void>;
  finishWorkout: () => Promise<void>;
  discard: () => Promise<boolean>;
  saveDraft: () => Promise<boolean>;
  retry: () => Promise<unknown>;
};

type SessionData = {
  completionBlocked?: boolean;
  day: WorkoutDay | null;
  session: GuidedSession | null;
  lifecycleGeneration?: number;
  lifecycleRevision?: number;
};

const defaultNow = (): number => Date.now();

type PersistenceTail = {
  tail: Promise<void>;
  lifecycle: SessionLifecycle | null;
};

type SessionLifecycle = {
  generation: number;
  revision: number;
  tombstoned: boolean;
  hookLeases: number;
  queryLeases: number;
  tailLeases: number;
  structuralMigration: StructuralMigration | null;
  finishOperation: FinishOperation | null;
};

type StructuralMigration = {
  generation: number;
  token: number;
};

type FinishOperation = {
  generation: number;
  token: number;
};

type SessionLifecycleVersion = {
  generation: number;
  revision: number;
  lifecycle: SessionLifecycle;
};

const persistenceTails = new Map<string, PersistenceTail>();
const sessionLifecycles = new Map<string, SessionLifecycle>();
let nextLifecycleGeneration = 1;
let nextStructuralMigrationToken = 1;
let nextFinishOperationToken = 1;

function enqueuePersistence<T>(key: string | null, operation: () => Promise<T>): Promise<T> {
  if (!key) return operation();

  const lifecycle = getSessionLifecycle(key);
  if (lifecycle) lifecycle.tailLeases += 1;
  const previous = persistenceTails.get(key)?.tail ?? Promise.resolve();
  const current = previous.then(operation, operation);
  const tail = current.then(
    () => undefined,
    () => undefined,
  );
  persistenceTails.set(key, { lifecycle, tail });
  void tail.then(() => {
    if (persistenceTails.get(key)?.tail === tail) persistenceTails.delete(key);
    if (lifecycle) {
      lifecycle.tailLeases = Math.max(0, lifecycle.tailLeases - 1);
      cleanupSessionLifecycle(key, lifecycle);
    }
  });
  return current;
}

function waitForPersistence(key: string | null): Promise<void> {
  return key ? (persistenceTails.get(key)?.tail ?? Promise.resolve()) : Promise.resolve();
}

function getSessionLifecycle(key: string | null): SessionLifecycle | null {
  if (!key) return null;
  return sessionLifecycles.get(key) ?? null;
}

function createSessionLifecycle(revision = 0): SessionLifecycle {
  return {
    generation: nextLifecycleGeneration++,
    hookLeases: 0,
    queryLeases: 0,
    revision,
    structuralMigration: null,
    tailLeases: 0,
    tombstoned: false,
    finishOperation: null,
  };
}

function cleanupSessionLifecycle(key: string | null, lifecycle: SessionLifecycle): boolean {
  if (!key || sessionLifecycles.get(key) !== lifecycle) return false;
  if (
    lifecycle.hookLeases > 0 ||
    lifecycle.queryLeases > 0 ||
    lifecycle.tailLeases > 0 ||
    lifecycle.structuralMigration ||
    lifecycle.finishOperation
  ) {
    return false;
  }
  sessionLifecycles.delete(key);
  return true;
}

function activateSessionLifecycle(key: string | null): SessionLifecycleVersion | null {
  if (!key) return null;
  let lifecycle = getSessionLifecycle(key);
  if (!lifecycle) {
    lifecycle = createSessionLifecycle();
    sessionLifecycles.set(key, lifecycle);
  } else if (lifecycle.tombstoned) {
    lifecycle.generation = nextLifecycleGeneration++;
    lifecycle.revision += 1;
    lifecycle.tombstoned = false;
    lifecycle.structuralMigration = null;
  }
  lifecycle.hookLeases += 1;
  return { generation: lifecycle.generation, lifecycle, revision: lifecycle.revision };
}

function captureSessionLifecycle(key: string | null): SessionLifecycleVersion | null {
  const lifecycle = getSessionLifecycle(key);
  return lifecycle
    ? { generation: lifecycle.generation, lifecycle, revision: lifecycle.revision }
    : null;
}

function releaseSessionLifecycleLease(
  key: string | null,
  lifecycle: SessionLifecycle | null,
  lease: 'hookLeases' | 'queryLeases',
): boolean {
  if (!lifecycle) return false;
  lifecycle[lease] = Math.max(0, lifecycle[lease] - 1);
  return cleanupSessionLifecycle(key, lifecycle);
}

function acquireSessionQueryLease(
  key: string | null,
  version: SessionLifecycleVersion | null,
): boolean {
  if (!key || !version) return false;
  const lifecycle = getSessionLifecycle(key);
  if (lifecycle !== version.lifecycle || lifecycle.tombstoned) return false;
  lifecycle.queryLeases += 1;
  return true;
}

function beginStructuralMigration(
  key: string | null,
  version: SessionLifecycleVersion | null,
): StructuralMigration | null {
  if (!key || !version) return null;
  const lifecycle = getSessionLifecycle(key);
  if (
    lifecycle !== version.lifecycle ||
    lifecycle.tombstoned ||
    lifecycle.generation !== version.generation
  ) {
    return null;
  }
  if (lifecycle.structuralMigration) return null;
  const migration = {
    generation: version.generation,
    token: nextStructuralMigrationToken++,
  };
  lifecycle.structuralMigration = migration;
  return migration;
}

function clearStructuralMigration(
  key: string | null,
  version: SessionLifecycleVersion | null,
  migration: StructuralMigration | null,
): void {
  if (!key || !version || !migration) return;
  const lifecycle = getSessionLifecycle(key);
  if (lifecycle !== version.lifecycle || lifecycle.structuralMigration?.token !== migration.token) {
    return;
  }
  lifecycle.structuralMigration = null;
  cleanupSessionLifecycle(key, lifecycle);
}

function beginFinishOperation(
  key: string | null,
  version: SessionLifecycleVersion | null,
): FinishOperation | null {
  if (!key || !version) return null;
  const lifecycle = getSessionLifecycle(key);
  if (
    lifecycle !== version.lifecycle ||
    lifecycle.tombstoned ||
    lifecycle.generation !== version.generation ||
    lifecycle.finishOperation
  ) {
    return null;
  }
  const operation = {
    generation: version.generation,
    token: nextFinishOperationToken++,
  };
  lifecycle.finishOperation = operation;
  return operation;
}

function clearFinishOperation(
  key: string | null,
  version: SessionLifecycleVersion | null,
  operation: FinishOperation | null,
): void {
  if (!key || !version || !operation) return;
  const lifecycle = getSessionLifecycle(key);
  if (lifecycle !== version.lifecycle || lifecycle.finishOperation?.token !== operation.token) {
    return;
  }
  lifecycle.finishOperation = null;
  cleanupSessionLifecycle(key, lifecycle);
}

function isIdentityMutationLocked(key: string | null): boolean {
  const lifecycle = getSessionLifecycle(key);
  return Boolean(lifecycle?.structuralMigration || lifecycle?.finishOperation);
}

function isSessionLifecycleCurrent(
  key: string | null,
  version: SessionLifecycleVersion | null,
): boolean {
  const lifecycle = getSessionLifecycle(key);
  return Boolean(
    lifecycle === version?.lifecycle &&
      lifecycle.generation === version.generation &&
      !lifecycle.tombstoned,
  );
}

function bumpSessionRevision(key: string | null): number {
  const lifecycle = getSessionLifecycle(key);
  if (!lifecycle) return 0;
  lifecycle.revision += 1;
  return lifecycle.revision;
}

function invalidateSessionLifecycle(
  key: string | null,
  expected?: SessionLifecycleVersion | null,
): void {
  const lifecycle = getSessionLifecycle(key);
  if (!lifecycle) return;
  if (
    expected &&
    (lifecycle !== expected.lifecycle || lifecycle.generation !== expected.generation)
  ) {
    return;
  }
  lifecycle.generation = nextLifecycleGeneration++;
  lifecycle.revision += 1;
  lifecycle.tombstoned = true;
  cleanupSessionLifecycle(key, lifecycle);
}

class StaleGuidedSessionQueryError extends Error {
  constructor() {
    super('Consulta da sessão guiada obsoleta.');
    this.name = 'StaleGuidedSessionQueryError';
  }
}

function persistenceKey(authUserId?: string, dayId?: string): string | null {
  return authUserId && dayId ? `${authUserId}:${dayId}` : null;
}

export function useGuidedWorkoutSession({
  api,
  authUserId,
  dayId,
  now = defaultNow,
  storage,
}: GuidedWorkoutInput): GuidedWorkoutController {
  const queryClient = useQueryClient();
  const sessionStorage = useMemo(
    () => storage ?? createWorkoutSessionStorage(AsyncStorage),
    [storage],
  );
  const workoutLogJournal = useMemo(() => createWorkoutLogJournal(AsyncStorage), []);
  const nowRef = useRef(now);
  const sessionRef = useRef<GuidedSession | null>(null);
  const dayRef = useRef<WorkoutDay | null>(null);
  const mountedRef = useRef(true);
  const lifecycleIdentityRef = useRef<string | null>(null);
  const lifecycleLeaseRef = useRef<SessionLifecycleVersion | null>(null);
  const committedIdentityRef = useRef<string | null>(null);
  const identityStateRef = useRef<{ identity: string | null; generation: number }>({
    identity: null,
    generation: 0,
  });
  const resetIdentityRef = useRef<string | null>(null);
  const [session, setSession] = useState<GuidedSession | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [canRetryFinish, setCanRetryFinish] = useState(false);
  const [queued, setQueued] = useState(false);
  const [draftActive, setDraftActive] = useState(false);
  const [completionBlocked, setCompletionBlocked] = useState(false);
  const [summary, setSummary] = useState<GuidedSessionSummary | null>(null);
  const busyRef = useRef(false);
  const mutationTokenRef = useRef<symbol | null>(null);
  const [busy, setBusy] = useState(false);
  const [queryEnabled, setQueryEnabled] = useState(true);
  const [identityReadyVersion, setIdentityReadyVersion] = useState(0);
  const appliedIdentityReadyVersionRef = useRef(0);
  const identity = persistenceKey(authUserId, dayId);
  if (identity !== null && resetIdentityRef.current === null) {
    resetIdentityRef.current = identity;
  }
  if (identityStateRef.current.identity !== identity) {
    identityStateRef.current = {
      identity,
      generation: identityStateRef.current.generation + 1,
    };
  }
  const identityGeneration = identityStateRef.current.generation;

  useEffect(() => {
    const previousIdentity = committedIdentityRef.current;
    if (previousIdentity !== identity) invalidateSessionLifecycle(previousIdentity);
    committedIdentityRef.current = identity;
  }, [identity]);

  useEffect(() => {
    const previousLifecycle = getSessionLifecycle(identity);
    const shouldClearGuidedCache = Boolean(
      identity &&
        (!previousLifecycle || previousLifecycle.tombstoned || previousLifecycle.hookLeases === 0),
    );
    const lease = activateSessionLifecycle(identity);
    lifecycleIdentityRef.current = identity;
    lifecycleLeaseRef.current = lease;
    if (shouldClearGuidedCache && authUserId && dayId) {
      queryClient.removeQueries({
        queryKey: ['guided-workout-session', authUserId, dayId],
        exact: true,
      });
    }
    return () => {
      const deleted = releaseSessionLifecycleLease(
        identity,
        lease?.lifecycle ?? null,
        'hookLeases',
      );
      if (deleted && authUserId && dayId) {
        queryClient.removeQueries({
          queryKey: ['guided-workout-session', authUserId, dayId],
          exact: true,
        });
      }
      if (lifecycleIdentityRef.current === identity && lifecycleLeaseRef.current === lease) {
        lifecycleIdentityRef.current = null;
        lifecycleLeaseRef.current = null;
      }
    };
  }, [authUserId, dayId, identity, queryClient]);

  const isCurrentIdentity = useCallback(
    (): boolean =>
      mountedRef.current &&
      identityStateRef.current.identity === identity &&
      identityStateRef.current.generation === identityGeneration &&
      resetIdentityRef.current === identity &&
      appliedIdentityReadyVersionRef.current === identityReadyVersion,
    [identity, identityGeneration, identityReadyVersion],
  );
  const isCurrentLogicalIdentity = useCallback(
    (targetIdentity: string | null): boolean =>
      mountedRef.current &&
      identityStateRef.current.identity === targetIdentity &&
      committedIdentityRef.current === targetIdentity &&
      resetIdentityRef.current === targetIdentity &&
      lifecycleIdentityRef.current === targetIdentity &&
      lifecycleLeaseRef.current !== null,
    [],
  );
  const guidedQueryKey = useMemo(
    () => ['guided-workout-session', authUserId, dayId] as const,
    [authUserId, dayId],
  );

  const beginMutation = useCallback((): symbol | null => {
    if (busyRef.current) return null;
    const token = Symbol('guided-workout-mutation');
    busyRef.current = true;
    mutationTokenRef.current = token;
    setBusy(true);
    return token;
  }, []);

  const endMutation = useCallback((token: symbol): void => {
    if (mutationTokenRef.current !== token) return;
    mutationTokenRef.current = null;
    busyRef.current = false;
    if (mountedRef.current) setBusy(false);
  }, []);

  const syncSessionCache = useCallback(
    (next: GuidedSession): void => {
      if (!authUserId || !dayId || !isCurrentIdentity()) return;
      const lifecycle = getSessionLifecycle(identity);
      queryClient.setQueryData<SessionData>(guidedQueryKey, (current) =>
        current
          ? {
              ...current,
              lifecycleGeneration: lifecycle?.generation,
              lifecycleRevision: lifecycle?.revision,
              session: next,
            }
          : current,
      );
    },
    [authUserId, dayId, guidedQueryKey, identity, isCurrentIdentity, queryClient],
  );

  const invalidateTodayWorkoutForUser = useCallback(
    async (targetAuthUserId: string): Promise<void> => {
      try {
        await queryClient.invalidateQueries({
          queryKey: ['today-workout', targetAuthUserId],
        });
      } catch {
        // Falha ao atualizar o cache não deve transformar operação confirmada em retry.
      }
    },
    [queryClient],
  );

  const invalidateTodayWorkout = useCallback(async (): Promise<void> => {
    if (!authUserId || !isCurrentIdentity()) return;
    await invalidateTodayWorkoutForUser(authUserId);
  }, [authUserId, invalidateTodayWorkoutForUser, isCurrentIdentity]);

  const clearGuidedSessionCacheForKey = useCallback(
    async (queryKey: readonly unknown[]): Promise<void> => {
      await queryClient.cancelQueries({ queryKey, exact: true });
      queryClient.removeQueries({ queryKey, exact: true });
    },
    [queryClient],
  );

  const removeGuidedSessionCache = useCallback(async (): Promise<void> => {
    await clearGuidedSessionCacheForKey(guidedQueryKey);
  }, [clearGuidedSessionCacheForKey, guidedQueryKey]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      busyRef.current = false;
      mutationTokenRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetIdentityRef.current === identity) return;
    resetIdentityRef.current = identity;
    sessionRef.current = null;
    dayRef.current = null;
    setSession(null);
    setSummary(null);
    setQueued(false);
    setActionError(null);
    setCanRetryFinish(false);
    setStorageError(null);
    setDraftActive(false);
    setCompletionBlocked(false);
    busyRef.current = false;
    mutationTokenRef.current = null;
    setBusy(false);
    setQueryEnabled(true);
    setIdentityReadyVersion((current) => {
      const next = current + 1;
      appliedIdentityReadyVersionRef.current = next;
      return next;
    });
  }, [identity]);

  const query = useQuery<SessionData>({
    enabled: Boolean(authUserId && dayId) && queryEnabled,
    queryKey: guidedQueryKey,
    queryFn: async ({ signal }) => {
      if (!authUserId || !dayId) throw new Error('Sessão não autenticada.');
      const version = captureSessionLifecycle(identity);
      if (!version || !acquireSessionQueryLease(identity, version)) {
        throw new StaleGuidedSessionQueryError();
      }
      const isQueryIdentityCurrent = (): boolean =>
        mountedRef.current &&
        identityStateRef.current.identity === identity &&
        identityStateRef.current.generation === identityGeneration;
      const assertActive = (): void => {
        if (
          signal.aborted ||
          !isQueryIdentityCurrent() ||
          !isSessionLifecycleCurrent(identity, version)
        ) {
          throw new StaleGuidedSessionQueryError();
        }
      };
      const terminalSession = sessionRef.current;
      const terminalDay = dayRef.current;
      if (
        terminalSession?.phase === 'summary' &&
        terminalDay &&
        isCurrentLogicalIdentity(identity)
      ) {
        const lifecycle = getSessionLifecycle(identity);
        assertActive();
        return {
          day: terminalDay,
          lifecycleGeneration: lifecycle?.generation,
          lifecycleRevision: lifecycle?.revision,
          session: terminalSession,
        };
      }
      const migrateIncompatibleDraft = async (freshDay: WorkoutDay): Promise<SessionData> => {
        const migration = beginStructuralMigration(identity, version);
        if (!migration) throw new StaleGuidedSessionQueryError();

        try {
          const recreated = await enqueuePersistence(identity, async () => {
            assertActive();
            const currentLifecycle = getSessionLifecycle(identity);
            if (
              !currentLifecycle ||
              currentLifecycle !== version.lifecycle ||
              currentLifecycle.generation !== migration.generation ||
              currentLifecycle.tombstoned ||
              currentLifecycle.structuralMigration?.token !== migration.token
            ) {
              throw new StaleGuidedSessionQueryError();
            }
            await sessionStorage.remove(authUserId, dayId);
            assertActive();
            const next = createGuidedSession(freshDay, nowRef.current());
            await sessionStorage.save(authUserId, freshDay, next);
            assertActive();
            bumpSessionRevision(identity);
            return next;
          });
          await invalidateTodayWorkout();
          assertActive();
          const currentLifecycle = getSessionLifecycle(identity);
          if (!currentLifecycle) throw new StaleGuidedSessionQueryError();
          const nextData: SessionData = {
            day: freshDay,
            lifecycleGeneration: currentLifecycle.generation,
            lifecycleRevision: currentLifecycle.revision,
            session: recreated,
          };
          if (isCurrentIdentity()) {
            dayRef.current = freshDay;
            sessionRef.current = recreated;
            setSession(recreated);
            setDraftActive(recreated.phase !== 'summary');
            queryClient.setQueryData(guidedQueryKey, nextData);
          }
          return nextData;
        } catch (error) {
          if (error instanceof StaleGuidedSessionQueryError) throw error;
          if (isCurrentIdentity()) {
            sessionRef.current = null;
            dayRef.current = null;
            setSession(null);
            setDraftActive(false);
            setQueryEnabled(false);
            setStorageError('Não foi possível recriar o rascunho do treino.');
          }
          throw error;
        } finally {
          clearStructuralMigration(identity, version, migration);
        }
      };

      try {
        await waitForPersistence(identity);
        assertActive();

        let stored: Awaited<ReturnType<WorkoutSessionStorage['load']>> = null;
        try {
          stored = await sessionStorage.load(authUserId, dayId);
          assertActive();
        } catch (error) {
          if (error instanceof StaleGuidedSessionQueryError) throw error;
          if (isCurrentIdentity()) setStorageError(getErrorMessage(error));
        }

        const operationDate = stored
          ? isoDateFromTimestamp(stored.session.startedAtMs)
          : todayIsoDate();
        const hasCompletion = await workoutLogJournal.hasForDay(authUserId, operationDate, dayId);
        assertActive();
        if (hasCompletion) {
          const lifecycle = getSessionLifecycle(identity);
          return {
            completionBlocked: true,
            day: stored?.kind === 'active' ? stored.day : null,
            lifecycleGeneration: lifecycle?.generation,
            lifecycleRevision: lifecycle?.revision,
            session: null,
          };
        }

        if (stored?.kind === 'active') {
          const lifecycle = getSessionLifecycle(identity);
          if (lifecycle && version && lifecycle.revision !== version.revision) {
            const currentSession = sessionRef.current;
            const currentDay = dayRef.current;
            if (!currentSession || !currentDay) throw new StaleGuidedSessionQueryError();
            return {
              day: currentDay,
              lifecycleGeneration: lifecycle.generation,
              lifecycleRevision: lifecycle.revision,
              session: currentSession,
            };
          }
          if (!isDraftCompatible(stored.session, stored.day)) {
            return migrateIncompatibleDraft(stored.day);
          }

          const resumed = resumeGuidedSession(stored.session, nowRef.current());
          await enqueuePersistence(identity, async () => {
            assertActive();
            const currentLifecycle = getSessionLifecycle(identity);
            if (currentLifecycle && version && currentLifecycle.revision !== version.revision) {
              throw new StaleGuidedSessionQueryError();
            }
            await sessionStorage.save(authUserId, stored.day, resumed);
            assertActive();
            bumpSessionRevision(identity);
          });
          const resumedLifecycle = getSessionLifecycle(identity);
          return {
            day: stored.day,
            lifecycleGeneration: resumedLifecycle?.generation,
            lifecycleRevision: resumedLifecycle?.revision,
            session: resumed,
          };
        }

        if (stored?.kind === 'legacy') {
          let cached: ReturnType<typeof normalizeCachedTodayWorkout>;
          try {
            const cachedRaw = await AsyncStorage.getItem(`today-workout:${authUserId}`);
            cached = cachedRaw
              ? normalizeCachedTodayWorkout(JSON.parse(cachedRaw) as unknown)
              : undefined;
          } catch {
            // Cache ausente ou inválido exige validar o dia pela API.
            cached = undefined;
          }
          if (
            cached?.status === 'available' &&
            cached.day.id === dayId &&
            isDraftCompatible(stored.session, cached.day)
          ) {
            const resumed = resumeGuidedSession(stored.session, nowRef.current());
            await enqueuePersistence(identity, async () => {
              assertActive();
              await sessionStorage.save(authUserId, cached.day, resumed);
              assertActive();
              bumpSessionRevision(identity);
            });
            const lifecycle = getSessionLifecycle(identity);
            return {
              day: cached.day,
              lifecycleGeneration: lifecycle?.generation,
              lifecycleRevision: lifecycle?.revision,
              session: resumed,
            };
          }
        }

        const day = await loadWorkoutDay({ api, dayId });
        assertActive();
        const draft = stored?.kind === 'legacy' ? stored.session : null;

        const lifecycle = getSessionLifecycle(identity);
        if (lifecycle && version && lifecycle.revision !== version.revision) {
          const currentSession = sessionRef.current;
          if (currentSession && isDraftCompatible(currentSession, day)) {
            return {
              day,
              lifecycleGeneration: lifecycle.generation,
              lifecycleRevision: lifecycle.revision,
              session: currentSession,
            };
          }
          if (!currentSession) throw new StaleGuidedSessionQueryError();
          return migrateIncompatibleDraft(day);
        }

        if (draft && !isDraftCompatible(draft, day)) {
          return migrateIncompatibleDraft(day);
        }

        if (draft) {
          const resumed = resumeGuidedSession(draft, nowRef.current());
          await enqueuePersistence(identity, async () => {
            assertActive();
            await sessionStorage.save(authUserId, day, resumed);
            assertActive();
            bumpSessionRevision(identity);
          });
          const currentLifecycle = getSessionLifecycle(identity);
          return {
            day,
            lifecycleGeneration: currentLifecycle?.generation,
            lifecycleRevision: currentLifecycle?.revision,
            session: resumed,
          };
        }

        const created = createGuidedSession(day, nowRef.current());
        assertActive();
        try {
          await enqueuePersistence(identity, async () => {
            assertActive();
            const currentLifecycle = getSessionLifecycle(identity);
            if (currentLifecycle && version && currentLifecycle.revision !== version.revision) {
              throw new StaleGuidedSessionQueryError();
            }
            await sessionStorage.save(authUserId, day, created);
            assertActive();
          });
          await invalidateTodayWorkout();
        } catch (error) {
          if (error instanceof StaleGuidedSessionQueryError) throw error;
          if (isCurrentIdentity()) setStorageError('Não foi possível salvar seu progresso.');
        }
        assertActive();
        return {
          day,
          lifecycleGeneration: version?.generation,
          lifecycleRevision: version?.revision,
          session: created,
        };
      } finally {
        releaseSessionLifecycleLease(identity, version.lifecycle, 'queryLeases');
      }
    },
  });

  useEffect(() => {
    if (!query.data || !isCurrentIdentity()) return;
    const lifecycle = getSessionLifecycle(identity);
    if (
      (query.data.lifecycleGeneration !== undefined &&
        query.data.lifecycleGeneration !== lifecycle?.generation) ||
      (query.data.lifecycleRevision !== undefined &&
        query.data.lifecycleRevision < (lifecycle?.revision ?? 0))
    ) {
      const current = sessionRef.current;
      if (current) syncSessionCache(current);
      return;
    }
    if (query.data.completionBlocked) {
      dayRef.current = query.data.day;
      sessionRef.current = null;
      setSession(null);
      setCompletionBlocked(true);
      setDraftActive(false);
      return;
    }
    if (!query.data.day || !query.data.session) return;
    setCompletionBlocked(false);
    dayRef.current = query.data.day;
    sessionRef.current = query.data.session;
    setSession(query.data.session);
    setSummary(
      query.data.session.phase === 'summary'
        ? buildSessionSummary(query.data.session, query.data.session.updatedAtMs)
        : null,
    );
    setDraftActive(query.data.session.phase !== 'summary');
  }, [identity, isCurrentIdentity, query.data, syncSessionCache]);

  const persistSession = useCallback(
    async (
      next: GuidedSession,
      day: WorkoutDay,
      invalidateToday = true,
      syncCache = true,
    ): Promise<boolean> => {
      if (!authUserId) return false;

      try {
        await sessionStorage.save(authUserId, day, next);
        if (!isCurrentIdentity()) return true;
        setStorageError(null);
        if (syncCache) syncSessionCache(next);
        if (invalidateToday) await invalidateTodayWorkout();
        return true;
      } catch (error) {
        if (isCurrentIdentity()) setStorageError('Não foi possível salvar seu progresso.');
        return false;
      }
    },
    [authUserId, invalidateTodayWorkout, isCurrentIdentity, sessionStorage, syncSessionCache],
  );

  const enqueueEdit = useCallback(
    (next: GuidedSession, day: WorkoutDay): Promise<void> => {
      return enqueuePersistence(identity, async () => {
        await persistSession(next, day, false, false);
      });
    },
    [identity, persistSession],
  );

  const transition = useCallback(
    async (derive: (current: GuidedSession, day: WorkoutDay, at: number) => GuidedSession) => {
      if (!isCurrentIdentity() || isIdentityMutationLocked(identity)) return;
      const token = beginMutation();
      if (!token) return;

      try {
        await enqueuePersistence(identity, async () => {
          const current = sessionRef.current;
          const day = query.data?.day ?? dayRef.current;
          if (!current || !day || !isCurrentIdentity()) return;
          bumpSessionRevision(identity);
          const next = derive(current, day, nowRef.current());
          sessionRef.current = next;
          setSession(next);
          syncSessionCache(next);
          setActionError(null);
          setCanRetryFinish(false);
          await persistSession(next, day);
        });
      } catch (error) {
        if (isCurrentIdentity()) {
          setActionError(getErrorMessage(error));
          setCanRetryFinish(false);
        }
      } finally {
        endMutation(token);
      }
    },
    [
      beginMutation,
      endMutation,
      identity,
      isCurrentIdentity,
      persistSession,
      query.data?.day,
      syncSessionCache,
    ],
  );

  const updateSet = useCallback(
    async (values: { loadKg?: string; repsDone?: string }) => {
      if (busyRef.current) return;
      if (!isCurrentIdentity() || isIdentityMutationLocked(identity)) return;
      const current = sessionRef.current;
      const day = query.data?.day ?? dayRef.current;
      if (!current || !day) return;

      try {
        bumpSessionRevision(identity);
        const next = updateCurrentSet(current, values, nowRef.current());
        sessionRef.current = next;
        setSession(next);
        syncSessionCache(next);
        setActionError(null);
        setCanRetryFinish(false);
        await enqueueEdit(next, day);
      } catch (error) {
        if (isCurrentIdentity()) {
          setActionError(getErrorMessage(error));
          setCanRetryFinish(false);
        }
      }
    },
    [enqueueEdit, identity, isCurrentIdentity, query.data?.day, syncSessionCache],
  );

  const completeSet = useCallback(async () => {
    await transition((current, day, at) => completeCurrentSet(current, day, at));
  }, [transition]);

  const addRestTime = useCallback(async () => {
    await transition((current, _day, at) => extendRest(current, at));
  }, [transition]);

  const skipRestAction = useCallback(async () => {
    await transition((current, day, at) => skipRest(current, day, at));
  }, [transition]);

  const continueAfterExerciseAction = useCallback(async () => {
    await transition((current, day, at) => continueAfterExercise(current, day, at));
  }, [transition]);

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (!isCurrentIdentity() || isIdentityMutationLocked(identity)) return false;
    const token = beginMutation();
    if (!token) return false;
    try {
      return await enqueuePersistence(identity, async () => {
        const current = sessionRef.current;
        const day = query.data?.day ?? dayRef.current;
        if (!current || !day || !isCurrentIdentity()) return false;
        const paused = pauseGuidedSession(current, nowRef.current());
        const persisted = await persistSession(paused, day, false, false);
        if (!persisted || !isCurrentIdentity()) return false;
        bumpSessionRevision(identity);
        sessionRef.current = paused;
        setSession(paused);
        syncSessionCache(paused);
        await invalidateTodayWorkout();
        return isCurrentIdentity();
      });
    } finally {
      endMutation(token);
    }
  }, [
    beginMutation,
    endMutation,
    identity,
    invalidateTodayWorkout,
    isCurrentIdentity,
    persistSession,
    query.data?.day,
    syncSessionCache,
  ]);

  const finishWorkout = useCallback(async (): Promise<void> => {
    if (
      !authUserId ||
      !dayId ||
      completionBlocked ||
      !isCurrentIdentity() ||
      isIdentityMutationLocked(identity)
    ) {
      return;
    }
    const token = beginMutation();
    if (!token) return;

    if (isCurrentIdentity()) {
      setActionError(null);
      setCanRetryFinish(false);
    }

    const finishIdentity = identity;
    const finishAuthUserId = authUserId;
    const finishDayId = dayId;
    const finishGuidedQueryKey = guidedQueryKey;
    const finishVersion = captureSessionLifecycle(finishIdentity);
    const finishOperation = beginFinishOperation(finishIdentity, finishVersion);
    if (!finishVersion || !finishOperation) {
      endMutation(token);
      return;
    }

    try {
      await enqueuePersistence(finishIdentity, async () => {
        const current = sessionRef.current;
        const day = query.data?.day ?? dayRef.current;
        if (!current || !day || !isCurrentIdentity()) return;
        if (current.phase !== 'ready-to-finish' || current.sets.some((set) => !set.completed)) {
          setActionError('O treino ainda não está pronto para finalizar.');
          return;
        }
        const finishedAtMs = nowRef.current();
        const nextSummary = buildSessionSummary(current, finishedAtMs);
        const result = await finishWorkoutWithOfflineFallback({
          bindRequester: () => api.bindCurrentSession(),
          date: isoDateFromTimestamp(current.startedAtMs),
          durationMin: nextSummary.durationMin,
          journal: workoutLogJournal,
          ownerAuthUserId: finishAuthUserId,
          sets: current.sets,
          workoutDayId: day.id,
        });
        const finished = markSessionFinished(current, finishedAtMs);

        const capturedLifecycle = getSessionLifecycle(finishIdentity);
        const capturedLifecycleWasCurrent = Boolean(
          capturedLifecycle === finishVersion.lifecycle &&
            capturedLifecycle?.finishOperation?.token === finishOperation.token,
        );
        if (capturedLifecycleWasCurrent) {
          const logicalIdentityIsCurrent = isCurrentLogicalIdentity(finishIdentity);
          if (!logicalIdentityIsCurrent) {
            invalidateSessionLifecycle(finishIdentity, finishVersion);
          }
          if (logicalIdentityIsCurrent) {
            setQueryEnabled(false);
            dayRef.current = day;
            sessionRef.current = finished;
            setSession(finished);
            setDraftActive(false);
            setStorageError(null);
            setSummary(nextSummary);
            setQueued(result.queued);
            setActionError(null);
            setCanRetryFinish(false);
          }
          try {
            await sessionStorage.remove(finishAuthUserId, finishDayId);
            if (isCurrentLogicalIdentity(finishIdentity)) {
              setDraftActive(false);
              setStorageError(null);
            }
          } catch (error) {
            if (isCurrentLogicalIdentity(finishIdentity)) {
              setStorageError('Treino concluído, mas não foi possível remover o rascunho.');
            }
          }

          await clearGuidedSessionCacheForKey(finishGuidedQueryKey);
          await invalidateTodayWorkoutForUser(finishAuthUserId);
        }
        if (!isCurrentLogicalIdentity(finishIdentity)) return;
        sessionRef.current = finished;
        setSession(finished);
        setSummary(nextSummary);
        setQueued(result.queued);
        setDraftActive(false);
      });
    } catch (error) {
      if (isCurrentLogicalIdentity(finishIdentity)) {
        setActionError('Não foi possível concluir o treino. Tente novamente.');
        setCanRetryFinish(true);
      }
    } finally {
      clearFinishOperation(finishIdentity, finishVersion, finishOperation);
      endMutation(token);
    }
  }, [
    api,
    authUserId,
    beginMutation,
    clearGuidedSessionCacheForKey,
    completionBlocked,
    dayId,
    endMutation,
    guidedQueryKey,
    identity,
    invalidateTodayWorkoutForUser,
    isCurrentIdentity,
    isCurrentLogicalIdentity,
    query.data?.day,
    sessionStorage,
    workoutLogJournal,
  ]);

  const discard = useCallback(async (): Promise<boolean> => {
    if (!authUserId || !dayId || !isCurrentIdentity() || isIdentityMutationLocked(identity)) {
      return false;
    }
    const token = beginMutation();
    if (!token) return false;
    invalidateSessionLifecycle(identity);
    setQueryEnabled(false);

    try {
      return await enqueuePersistence(identity, async () => {
        await sessionStorage.remove(authUserId, dayId);
        await removeGuidedSessionCache();
        await invalidateTodayWorkout();
        if (!isCurrentIdentity()) return false;
        sessionRef.current = null;
        dayRef.current = null;
        setSession(null);
        setDraftActive(false);
        setStorageError(null);
        return true;
      });
    } catch (error) {
      if (isCurrentIdentity()) setStorageError('Não foi possível encerrar o treino.');
      return false;
    } finally {
      endMutation(token);
    }
  }, [
    authUserId,
    beginMutation,
    dayId,
    endMutation,
    identity,
    invalidateTodayWorkout,
    isCurrentIdentity,
    removeGuidedSessionCache,
    sessionStorage,
  ]);

  const identityReady = isCurrentIdentity();
  const visibleSession = identityReady ? session : null;
  const visibleDay = identityReady ? (query.data?.day ?? dayRef.current) : null;
  const state: GuidedWorkoutState = !identityReady
    ? 'loading'
    : completionBlocked
      ? 'completed'
      : query.isPending && !session
        ? 'loading'
        : query.isError && !session
          ? 'error'
          : !session
            ? 'error'
            : 'ready';

  return {
    actionError,
    canRetryFinish,
    addRestTime,
    completeSet,
    continueAfterExercise: continueAfterExerciseAction,
    day: visibleDay,
    discard,
    draftActive,
    error:
      query.error instanceof Error
        ? query.error
        : query.error
          ? new Error('Falha ao carregar treino.')
          : null,
    finishWorkout,
    busy,
    queued,
    retry: query.refetch,
    saveDraft,
    session: visibleSession,
    skipRest: skipRestAction,
    state,
    storageError,
    summary,
    updateSet,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Falha inesperada.';
}

function isDraftCompatible(draft: GuidedSession, day: WorkoutDay): boolean {
  if (draft.workoutDayId !== day.id || day.exercises.length === 0) return false;

  const expectedSets = day.exercises.flatMap((exercise) =>
    Array.from({ length: exercise.sets }, (_, index) => ({
      workoutExerciseId: exercise.id,
      setNumber: index + 1,
    })),
  );
  if (expectedSets.length === 0 || draft.sets.length !== expectedSets.length) return false;

  const sameSets = draft.sets.every(
    (set, index) =>
      set.workoutExerciseId === expectedSets[index]?.workoutExerciseId &&
      set.setNumber === expectedSets[index]?.setNumber,
  );
  if (!sameSets) return false;

  const currentExercise = day.exercises[draft.currentExerciseIndex];
  if (
    !currentExercise ||
    draft.currentSetIndex < 0 ||
    draft.currentSetIndex >= currentExercise.sets
  ) {
    return false;
  }
  if (draft.phase === 'rest' && draft.currentSetIndex >= currentExercise.sets - 1) return false;
  if (draft.phase === 'exercise-complete' && draft.currentSetIndex !== currentExercise.sets - 1) {
    return false;
  }
  if (
    (draft.phase === 'ready-to-finish' || draft.phase === 'summary') &&
    (draft.currentExerciseIndex !== day.exercises.length - 1 ||
      draft.currentSetIndex !== currentExercise.sets - 1)
  ) {
    return false;
  }

  return true;
}
