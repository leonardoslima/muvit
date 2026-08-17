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
  const sessionIdentityRef = useRef<string | null>(null);
  const [session, setSession] = useState<GuidedSession | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [canRetryFinish, setCanRetryFinish] = useState(false);
  const [queued, setQueued] = useState(false);
  const [draftActive, setDraftActive] = useState(false);
  const [summary, setSummary] = useState<GuidedSessionSummary | null>(null);
  const busyRef = useRef(false);
  const editQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [busy, setBusy] = useState(false);
  const guidedQueryKey = useMemo(
    () => ['guided-workout-session', authUserId, dayId] as const,
    [authUserId, dayId],
  );

  const beginMutation = useCallback((): boolean => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    return true;
  }, []);

  const endMutation = useCallback((): void => {
    busyRef.current = false;
    setBusy(false);
  }, []);

  const syncSessionCache = useCallback(
    (next: GuidedSession): void => {
      if (!authUserId || !dayId) return;
      queryClient.setQueryData<SessionData>(guidedQueryKey, (current) =>
        current ? { ...current, session: next } : current,
      );
    },
    [authUserId, dayId, guidedQueryKey, queryClient],
  );

  const invalidateTodayWorkout = useCallback(async (): Promise<void> => {
    if (!authUserId) return;
    try {
      await queryClient.invalidateQueries({
        queryKey: ['today-workout', authUserId],
      });
    } catch {
      // Falha ao atualizar o cache não deve transformar operação confirmada em retry.
    }
  }, [authUserId, queryClient]);

  const removeGuidedSessionCache = useCallback((): void => {
    queryClient.removeQueries({ queryKey: guidedQueryKey, exact: true });
  }, [guidedQueryKey, queryClient]);

  const clearGuidedSessionCache = useCallback((): void => {
    queryClient.removeQueries({ queryKey: guidedQueryKey, exact: true });
  }, [guidedQueryKey, queryClient]);

  useEffect(() => {
    const sessionIdentity = authUserId && dayId ? `${authUserId}:${dayId}` : null;
    if (sessionIdentityRef.current === sessionIdentity) return;
    sessionIdentityRef.current = sessionIdentity;
    sessionRef.current = null;
    dayRef.current = null;
    setSession(null);
    setSummary(null);
    setQueued(false);
    setActionError(null);
    setCanRetryFinish(false);
    setStorageError(null);
    setDraftActive(false);
  }, [authUserId, dayId]);

  const query = useQuery<SessionData>({
    enabled: Boolean(authUserId && dayId),
    queryKey: guidedQueryKey,
    queryFn: async () => {
      if (!authUserId || !dayId) throw new Error('Sessão não autenticada.');

      const day = await loadWorkoutDay({ api, dayId });
      let draft: GuidedSession | null = null;

      try {
        draft = await sessionStorage.load(authUserId, dayId);
      } catch (error) {
        setStorageError(getErrorMessage(error));
      }

      if (draft && !isDraftCompatible(draft, day)) {
        try {
          await sessionStorage.remove(authUserId, dayId);
        } catch (error) {
          setStorageError('Não foi possível remover o rascunho incompatível.');
        }
        draft = null;
      }

      if (draft) return { day, session: draft };

      const created = createGuidedSession(day, nowRef.current());
      try {
        await sessionStorage.save(authUserId, created);
        await invalidateTodayWorkout();
      } catch (error) {
        setStorageError('Não foi possível salvar seu progresso.');
      }
      return { day, session: created };
    },
  });

  useEffect(() => {
    if (!query.data) return;
    dayRef.current = query.data.day;
    sessionRef.current = query.data.session;
    setSession(query.data.session);
    setDraftActive(query.data.session.phase !== 'summary');
  }, [query.data]);

  const persistSession = useCallback(
    async (next: GuidedSession, invalidateToday = true, syncCache = true): Promise<boolean> => {
      if (!authUserId) return false;

      try {
        await sessionStorage.save(authUserId, next);
        setStorageError(null);
        if (syncCache) syncSessionCache(next);
        if (invalidateToday) await invalidateTodayWorkout();
        return true;
      } catch (error) {
        setStorageError('Não foi possível salvar seu progresso.');
        return false;
      }
    },
    [authUserId, invalidateTodayWorkout, sessionStorage, syncSessionCache],
  );

  const enqueueEdit = useCallback(
    (next: GuidedSession): Promise<void> => {
      const write = async (): Promise<void> => {
        await persistSession(next, false, false);
      };
      const queued = editQueueRef.current.then(write, write);
      editQueueRef.current = queued.then(
        () => undefined,
        () => undefined,
      );
      return editQueueRef.current;
    },
    [persistSession],
  );

  const waitForPendingEdits = useCallback(async (): Promise<void> => {
    await editQueueRef.current;
  }, []);

  const transition = useCallback(
    async (derive: (current: GuidedSession, day: WorkoutDay, at: number) => GuidedSession) => {
      if (!beginMutation()) return;

      try {
        await waitForPendingEdits();
        const current = sessionRef.current;
        const day = query.data?.day ?? dayRef.current;
        if (!current || !day) return;
        const next = derive(current, day, nowRef.current());
        sessionRef.current = next;
        setSession(next);
        syncSessionCache(next);
        setActionError(null);
        setCanRetryFinish(false);
        await persistSession(next);
      } catch (error) {
        setActionError(getErrorMessage(error));
        setCanRetryFinish(false);
      } finally {
        endMutation();
      }
    },
    [
      beginMutation,
      endMutation,
      persistSession,
      query.data?.day,
      syncSessionCache,
      waitForPendingEdits,
    ],
  );

  const updateSet = useCallback(
    async (values: { loadKg?: string; repsDone?: string }) => {
      if (busyRef.current) return;
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
        setActionError(getErrorMessage(error));
        setCanRetryFinish(false);
      }
    },
    [enqueueEdit, query.data?.day, syncSessionCache],
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
    if (!beginMutation()) return false;
    try {
      await waitForPendingEdits();
      const current = sessionRef.current;
      if (!current) return false;
      return await persistSession(current);
    } finally {
      endMutation();
    }
  }, [beginMutation, endMutation, persistSession, waitForPendingEdits]);

  const finishWorkout = useCallback(async (): Promise<void> => {
    if (!authUserId || !dayId || !beginMutation()) return;

    setActionError(null);
    setCanRetryFinish(false);

    try {
      await waitForPendingEdits();
      const current = sessionRef.current;
      const day = query.data?.day ?? dayRef.current;
      if (!current || !day) return;
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
        setDraftActive(false);
        setStorageError(null);
      } catch (error) {
        setStorageError('Treino concluído, mas não foi possível remover o rascunho.');
      }

      const finished = markSessionFinished(current, finishedAtMs);
      sessionRef.current = finished;
      setSession(finished);
      setSummary(nextSummary);
      setQueued(result.queued);
      syncSessionCache(finished);
      clearGuidedSessionCache();
      await invalidateTodayWorkout();
    } catch (error) {
      setActionError('Não foi possível concluir o treino. Tente novamente.');
      setCanRetryFinish(true);
    } finally {
      endMutation();
    }
  }, [
    api,
    authUserId,
    beginMutation,
    clearGuidedSessionCache,
    dayId,
    endMutation,
    invalidateTodayWorkout,
    query.data?.day,
    sessionStorage,
    syncSessionCache,
    waitForPendingEdits,
  ]);

  const discard = useCallback(async (): Promise<boolean> => {
    if (!authUserId || !dayId) return false;
    if (!beginMutation()) return false;

    try {
      await waitForPendingEdits();
      await sessionStorage.remove(authUserId, dayId);
      removeGuidedSessionCache();
      await invalidateTodayWorkout();
      setDraftActive(false);
      setStorageError(null);
      return true;
    } catch (error) {
      setStorageError('Não foi possível encerrar o treino.');
      return false;
    } finally {
      endMutation();
    }
  }, [
    authUserId,
    beginMutation,
    dayId,
    endMutation,
    invalidateTodayWorkout,
    removeGuidedSessionCache,
    sessionStorage,
    waitForPendingEdits,
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
