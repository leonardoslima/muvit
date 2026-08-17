import type { workoutPlanFullSchema } from '@muvit/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
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
  storageError: string | null;
  queued: boolean;
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
  const sessionStorage = useMemo(
    () => storage ?? createWorkoutSessionStorage(AsyncStorage),
    [storage],
  );
  const nowRef = useRef(now);
  const sessionRef = useRef<GuidedSession | null>(null);
  const sessionIdentityRef = useRef<string | null>(null);
  const [session, setSession] = useState<GuidedSession | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [draftActive, setDraftActive] = useState(false);
  const [summary, setSummary] = useState<GuidedSessionSummary | null>(null);

  useEffect(() => {
    const sessionIdentity = authUserId && dayId ? `${authUserId}:${dayId}` : null;
    if (sessionIdentityRef.current === sessionIdentity) return;
    sessionIdentityRef.current = sessionIdentity;
    sessionRef.current = null;
    setSession(null);
    setSummary(null);
    setQueued(false);
    setActionError(null);
    setStorageError(null);
    setDraftActive(false);
  }, [authUserId, dayId]);

  const query = useQuery<SessionData>({
    enabled: Boolean(authUserId && dayId),
    queryKey: ['guided-workout-session', authUserId, dayId],
    queryFn: async () => {
      if (!authUserId || !dayId) throw new Error('Sessão não autenticada.');

      const day = await loadWorkoutDay({ api, dayId });
      let draft: GuidedSession | null = null;

      try {
        draft = await sessionStorage.load(authUserId, dayId);
      } catch (error) {
        setStorageError(getErrorMessage(error));
      }

      if (draft) return { day, session: draft };

      const created = createGuidedSession(day, nowRef.current());
      try {
        await sessionStorage.save(authUserId, created);
      } catch (error) {
        setStorageError('Não foi possível salvar seu progresso.');
      }
      return { day, session: created };
    },
  });

  useEffect(() => {
    if (!query.data) return;
    sessionRef.current = query.data.session;
    setSession(query.data.session);
    setDraftActive(true);
  }, [query.data]);

  const persistSession = useCallback(
    async (next: GuidedSession): Promise<boolean> => {
      if (!authUserId) return false;

      try {
        await sessionStorage.save(authUserId, next);
        setStorageError(null);
        return true;
      } catch (error) {
        setStorageError('Não foi possível salvar seu progresso.');
        return false;
      }
    },
    [authUserId, sessionStorage],
  );

  const transition = useCallback(
    async (derive: (current: GuidedSession, day: WorkoutDay, at: number) => GuidedSession) => {
      const current = sessionRef.current;
      const day = query.data?.day;
      if (!current || !day) return;

      try {
        const next = derive(current, day, nowRef.current());
        sessionRef.current = next;
        setSession(next);
        setActionError(null);
        await persistSession(next);
      } catch (error) {
        setActionError(getErrorMessage(error));
      }
    },
    [persistSession, query.data?.day],
  );

  const updateSet = useCallback(
    async (values: { loadKg?: string; repsDone?: string }) => {
      await transition((current, _day, at) => updateCurrentSet(current, values, at));
    },
    [transition],
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
    const current = sessionRef.current;
    if (!current) return false;
    return persistSession(current);
  }, [persistSession]);

  const finishWorkout = useCallback(async (): Promise<void> => {
    const current = sessionRef.current;
    const day = query.data?.day;
    if (!current || !day || !authUserId || !dayId) return;

    setActionError(null);
    const finishedAtMs = nowRef.current();
    const nextSummary = buildSessionSummary(current, finishedAtMs);

    try {
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
    } catch (error) {
      setActionError('Não foi possível concluir o treino. Tente novamente.');
    }
  }, [api, authUserId, dayId, query.data?.day, sessionStorage]);

  const discard = useCallback(async (): Promise<boolean> => {
    if (!authUserId || !dayId) return false;

    try {
      await sessionStorage.remove(authUserId, dayId);
      setDraftActive(false);
      setStorageError(null);
      return true;
    } catch (error) {
      setStorageError('Não foi possível encerrar o treino.');
      return false;
    }
  }, [authUserId, dayId, sessionStorage]);

  const state: GuidedWorkoutState = query.isPending
    ? 'loading'
    : query.isError || !query.data || !session
      ? 'error'
      : 'ready';

  return {
    actionError,
    addRestTime,
    completeSet,
    continueAfterExercise: continueAfterExerciseAction,
    day: query.data?.day ?? null,
    discard,
    draftActive,
    error:
      query.error instanceof Error
        ? query.error
        : query.error
          ? new Error('Falha ao carregar treino.')
          : null,
    finishWorkout,
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
