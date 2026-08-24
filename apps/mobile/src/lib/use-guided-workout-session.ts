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
  skipRest,
  updateCurrentSet,
} from '../application/workouts/guided-session';
import { loadWorkoutDay } from '../application/workouts/today-workout';
import { finishWorkoutWithOfflineFallback } from '../application/workouts/workout-log';
import type { ApiClient } from './api';
import { todayIsoDate } from './date';
import { createLogQueue, sendPendingWorkoutLog } from './log-queue';
import { type WorkoutSessionStorage, createWorkoutSessionStorage } from './workout-session-storage';

export type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
export type WorkoutDay = WorkoutPlan['days'][number];
export type GuidedWorkoutState = 'loading' | 'error' | 'ready';

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
  day: WorkoutDay;
  session: GuidedSession;
};

const defaultNow = (): number => Date.now();

type PersistenceTail = {
  tail: Promise<void>;
};

const persistenceTails = new Map<string, PersistenceTail>();

function enqueuePersistence<T>(key: string | null, operation: () => Promise<T>): Promise<T> {
  if (!key) return operation();

  const previous = persistenceTails.get(key)?.tail ?? Promise.resolve();
  const current = previous.then(operation, operation);
  const tail = current.then(
    () => undefined,
    () => undefined,
  );
  persistenceTails.set(key, { tail });
  void tail.then(() => {
    if (persistenceTails.get(key)?.tail === tail) persistenceTails.delete(key);
  });
  return current;
}

function waitForPersistence(key: string | null): Promise<void> {
  return key ? (persistenceTails.get(key)?.tail ?? Promise.resolve()) : Promise.resolve();
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
  const nowRef = useRef(now);
  const sessionRef = useRef<GuidedSession | null>(null);
  const dayRef = useRef<WorkoutDay | null>(null);
  const mountedRef = useRef(true);
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
  const [summary, setSummary] = useState<GuidedSessionSummary | null>(null);
  const busyRef = useRef(false);
  const mutationTokenRef = useRef<symbol | null>(null);
  const [busy, setBusy] = useState(false);
  const identity = persistenceKey(authUserId, dayId);
  if (identityStateRef.current.identity !== identity) {
    identityStateRef.current = {
      identity,
      generation: identityStateRef.current.generation + 1,
    };
  }
  const identityGeneration = identityStateRef.current.generation;
  const isCurrentIdentity = useCallback(
    (): boolean =>
      mountedRef.current &&
      identityStateRef.current.identity === identity &&
      identityStateRef.current.generation === identityGeneration,
    [identity, identityGeneration],
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
      queryClient.setQueryData<SessionData>(guidedQueryKey, (current) =>
        current ? { ...current, session: next } : current,
      );
    },
    [authUserId, dayId, guidedQueryKey, isCurrentIdentity, queryClient],
  );

  const invalidateTodayWorkout = useCallback(async (): Promise<void> => {
    if (!authUserId || !isCurrentIdentity()) return;
    try {
      await queryClient.invalidateQueries({
        queryKey: ['today-workout', authUserId],
      });
    } catch {
      // Falha ao atualizar o cache não deve transformar operação confirmada em retry.
    }
  }, [authUserId, isCurrentIdentity, queryClient]);

  const removeGuidedSessionCache = useCallback((): void => {
    queryClient.removeQueries({ queryKey: guidedQueryKey, exact: true });
  }, [guidedQueryKey, queryClient]);

  const clearGuidedSessionCache = useCallback((): void => {
    queryClient.removeQueries({ queryKey: guidedQueryKey, exact: true });
  }, [guidedQueryKey, queryClient]);

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
    busyRef.current = false;
    mutationTokenRef.current = null;
    setBusy(false);
  }, [identity]);

  const query = useQuery<SessionData>({
    enabled: Boolean(authUserId && dayId),
    queryKey: guidedQueryKey,
    queryFn: async () => {
      if (!authUserId || !dayId) throw new Error('Sessão não autenticada.');
      await waitForPersistence(identity);

      const day = await loadWorkoutDay({ api, dayId });
      let draft: GuidedSession | null = null;

      try {
        draft = await sessionStorage.load(authUserId, dayId);
      } catch (error) {
        if (isCurrentIdentity()) setStorageError(getErrorMessage(error));
      }

      if (draft && !isDraftCompatible(draft, day)) {
        try {
          await enqueuePersistence(identity, async () => {
            await sessionStorage.remove(authUserId, dayId);
          });
        } catch {
          if (isCurrentIdentity())
            setStorageError('Não foi possível remover o rascunho incompatível.');
        }
        draft = null;
      }

      if (draft) return { day, session: draft };

      const created = createGuidedSession(day, nowRef.current());
      try {
        await enqueuePersistence(identity, async () => {
          await sessionStorage.save(authUserId, created);
        });
        await invalidateTodayWorkout();
      } catch (error) {
        if (isCurrentIdentity()) setStorageError('Não foi possível salvar seu progresso.');
      }
      return { day, session: created };
    },
  });

  useEffect(() => {
    if (!query.data || !isCurrentIdentity()) return;
    dayRef.current = query.data.day;
    sessionRef.current = query.data.session;
    setSession(query.data.session);
    setDraftActive(query.data.session.phase !== 'summary');
  }, [isCurrentIdentity, query.data]);

  const persistSession = useCallback(
    async (next: GuidedSession, invalidateToday = true, syncCache = true): Promise<boolean> => {
      if (!authUserId) return false;

      try {
        await sessionStorage.save(authUserId, next);
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
    (next: GuidedSession): Promise<void> => {
      return enqueuePersistence(identity, async () => {
        await persistSession(next, false, false);
      });
    },
    [identity, persistSession],
  );

  const transition = useCallback(
    async (derive: (current: GuidedSession, day: WorkoutDay, at: number) => GuidedSession) => {
      const token = beginMutation();
      if (!token) return;

      try {
        await enqueuePersistence(identity, async () => {
          const current = sessionRef.current;
          const day = query.data?.day ?? dayRef.current;
          if (!current || !day || !isCurrentIdentity()) return;
          const next = derive(current, day, nowRef.current());
          sessionRef.current = next;
          setSession(next);
          syncSessionCache(next);
          setActionError(null);
          setCanRetryFinish(false);
          await persistSession(next);
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
      if (!isCurrentIdentity()) return;
      const current = sessionRef.current;
      const day = query.data?.day ?? dayRef.current;
      if (!current || !day) return;

      try {
        const next = updateCurrentSet(current, values, nowRef.current());
        sessionRef.current = next;
        setSession(next);
        syncSessionCache(next);
        setActionError(null);
        setCanRetryFinish(false);
        await enqueueEdit(next);
      } catch (error) {
        if (isCurrentIdentity()) {
          setActionError(getErrorMessage(error));
          setCanRetryFinish(false);
        }
      }
    },
    [enqueueEdit, isCurrentIdentity, query.data?.day, syncSessionCache],
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
    const token = beginMutation();
    if (!token) return false;
    try {
      return await enqueuePersistence(identity, async () => {
        const current = sessionRef.current;
        if (!current || !isCurrentIdentity()) return false;
        const persisted = await persistSession(current);
        return isCurrentIdentity() && persisted;
      });
    } finally {
      endMutation(token);
    }
  }, [beginMutation, endMutation, identity, isCurrentIdentity, persistSession]);

  const finishWorkout = useCallback(async (): Promise<void> => {
    if (!authUserId || !dayId) return;
    const token = beginMutation();
    if (!token) return;

    if (isCurrentIdentity()) {
      setActionError(null);
      setCanRetryFinish(false);
    }

    try {
      await enqueuePersistence(identity, async () => {
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
          api,
          date: todayIsoDate(),
          durationMin: nextSummary.durationMin,
          queue: createLogQueue(AsyncStorage),
          send: sendPendingWorkoutLog,
          sets: current.sets,
          workoutDayId: day.id,
        });

        try {
          await sessionStorage.remove(authUserId, dayId);
          if (isCurrentIdentity()) {
            setDraftActive(false);
            setStorageError(null);
          }
        } catch (error) {
          if (isCurrentIdentity()) {
            setStorageError('Treino concluído, mas não foi possível remover o rascunho.');
          }
        }

        if (!isCurrentIdentity()) return;
        const finished = markSessionFinished(current, finishedAtMs);
        sessionRef.current = finished;
        setSession(finished);
        setSummary(nextSummary);
        setQueued(result.queued);
        syncSessionCache(finished);
        clearGuidedSessionCache();
        await invalidateTodayWorkout();
      });
    } catch (error) {
      if (isCurrentIdentity()) {
        setActionError('Não foi possível concluir o treino. Tente novamente.');
        setCanRetryFinish(true);
      }
    } finally {
      endMutation(token);
    }
  }, [
    api,
    authUserId,
    beginMutation,
    clearGuidedSessionCache,
    dayId,
    endMutation,
    identity,
    invalidateTodayWorkout,
    isCurrentIdentity,
    query.data?.day,
    sessionStorage,
    syncSessionCache,
  ]);

  const discard = useCallback(async (): Promise<boolean> => {
    if (!authUserId || !dayId) return false;
    const token = beginMutation();
    if (!token) return false;

    try {
      return await enqueuePersistence(identity, async () => {
        await sessionStorage.remove(authUserId, dayId);
        removeGuidedSessionCache();
        await invalidateTodayWorkout();
        if (!isCurrentIdentity()) return false;
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

  const state: GuidedWorkoutState =
    query.isPending && !session
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
    day: query.data?.day ?? dayRef.current,
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
    session,
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
