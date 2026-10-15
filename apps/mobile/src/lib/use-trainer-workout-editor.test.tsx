import type { WorkoutPlanDraft } from '@muvit/validators';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { trainerWorkoutDraftQueryKey } from '../application/workouts/trainer-workout-data';
import type { ApiRequester } from './api';
import { useTrainerWorkoutEditor } from './use-trainer-workout-editor';

const AUTH_USER_ID = '00000000-0000-0000-0000-000000000801';
const STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const PLAN_ID = '00000000-0000-0000-0000-000000000301';
const PUBLISHED_PLAN_ID = '00000000-0000-0000-0000-000000000302';
const DRAFT_ID = '00000000-0000-0000-0000-000000000501';
const EXERCISE_ID = '00000000-0000-0000-0000-000000000101';

function draftFixture(): WorkoutPlanDraft {
  return {
    id: DRAFT_ID,
    trainerId: '00000000-0000-0000-0000-000000000901',
    studentId: STUDENT_ID,
    sourcePlanId: PLAN_ID,
    payload: {
      name: 'Força',
      notes: 'Progressão semanal',
      days: [
        {
          label: 'Treino A',
          dayOrder: 0,
          exercises: [
            { exerciseId: EXERCISE_ID, exerciseOrder: 0, sets: 4, reps: '8-10', tempo: '3010' },
          ],
        },
        {
          label: 'Treino B',
          dayOrder: 1,
          exercises: [
            { exerciseId: EXERCISE_ID, exerciseOrder: 0, sets: 3, reps: '10', restSeconds: 90 },
          ],
        },
      ],
    },
    selectedDayOrder: 1,
    revision: 4,
    createdAt: '2026-10-15T12:00:00.000Z',
    updatedAt: '2026-10-15T12:30:00.000Z',
    exerciseReferences: [{ id: EXERCISE_ID, name: 'Supino reto', muscleGroup: 'chest' }],
  };
}

function activePlanFixture(name: string) {
  return {
    id: PLAN_ID,
    studentId: STUDENT_ID,
    trainerId: '00000000-0000-0000-0000-000000000901',
    name,
    startDate: null,
    endDate: null,
    status: 'active' as const,
    notes: 'Progressão semanal',
    createdAt: '2026-10-15T12:00:00.000Z',
    days: [
      {
        id: '00000000-0000-0000-0000-000000000201',
        planId: PLAN_ID,
        label: 'Treino A',
        dayOrder: 0,
        exercises: [
          {
            id: '00000000-0000-0000-0000-000000000401',
            workoutDayId: '00000000-0000-0000-0000-000000000201',
            exerciseId: EXERCISE_ID,
            exerciseOrder: 0,
            sets: 4,
            reps: '8-10',
            restSeconds: null,
            loadKg: null,
            tempo: '3010',
            notes: null,
            exercise: { id: EXERCISE_ID, name: 'Supino reto', muscleGroup: 'chest' },
          },
        ],
      },
    ],
  };
}

function twoDayActivePlanFixture(name: string) {
  const plan = activePlanFixture(name);
  const firstDay = plan.days[0];
  if (!firstDay) return plan;
  const firstExercise = firstDay.exercises[0];
  return {
    ...plan,
    days: [
      firstDay,
      {
        ...firstDay,
        id: '00000000-0000-0000-0000-000000000202',
        label: 'Treino B',
        dayOrder: 1,
        exercises: firstExercise
          ? [
              {
                ...firstExercise,
                id: '00000000-0000-0000-0000-000000000402',
                workoutDayId: '00000000-0000-0000-0000-000000000202',
              },
            ]
          : [],
      },
    ],
  };
}

function validEditorState(name = 'Força') {
  return {
    name,
    notes: 'Progressão semanal',
    status: 'active' as const,
    days: [
      {
        localId: 'day-local-1',
        label: 'Treino A',
        exercises: [
          {
            localId: 'exercise-local-1',
            exerciseId: EXERCISE_ID,
            exerciseName: 'Supino reto',
            muscleGroup: 'chest',
            sets: '4',
            reps: '8-10',
            restSeconds: '90',
            loadKg: '82.5',
            notes: 'Sem falhar',
            tempo: '3010',
          },
        ],
      },
    ],
  };
}

function setup(
  api: ApiRequester,
  mode: 'create' | 'edit',
  options: { planId?: string; draftId?: string } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () =>
      useTrainerWorkoutEditor({
        api,
        authUserId: AUTH_USER_ID,
        studentId: STUDENT_ID,
        planId: options.planId,
        draftId: options.draftId,
        mode,
      }),
    { wrapper },
  );

  return { ...hook, queryClient };
}

describe('useTrainerWorkoutEditor', () => {
  it('não envia draft quando o payload ainda é inválido', async () => {
    const api = { request: vi.fn() } as unknown as ApiRequester;
    const { result } = setup(api, 'create');

    let saved = true;
    await act(async () => {
      saved = await result.current.saveDraft();
    });

    expect(saved).toBe(false);
    expect(api.request).not.toHaveBeenCalled();
    expect(result.current.feedback?.message).toBe('Informe um nome para o treino.');
  });

  it('retoma referências e o dia escolhidos pelo servidor sem consumir o draft', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce(draftFixture())
        .mockResolvedValueOnce(activePlanFixture('Força')),
    } as unknown as ApiRequester;
    const { result } = setup(api, 'edit', { planId: PLAN_ID, draftId: DRAFT_ID });

    await waitFor(() => expect(result.current.editor.name).toBe('Força'));

    expect(result.current.activeDay?.label).toBe('Treino B');
    expect(result.current.activeDay?.exercises[0]?.exerciseName).toBe('Supino reto');
    expect(api.request).toHaveBeenCalledTimes(2);
    expect(api.request).toHaveBeenCalledWith(`/workout-plan-drafts/${DRAFT_ID}`, {
      signal: expect.anything(),
    });
    expect(result.current.draftRecovered).toBe(true);
  });

  it('publica o draft retomado com revisão e estado atual uma vez após confirmação', async () => {
    let resolvePublish: (plan: ReturnType<typeof activePlanFixture>) => void = () => undefined;
    const pendingPublish = new Promise<ReturnType<typeof activePlanFixture>>((resolve) => {
      resolvePublish = resolve;
    });
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce(draftFixture())
        .mockResolvedValueOnce(activePlanFixture('Força'))
        .mockReturnValueOnce(pendingPublish),
    } as unknown as ApiRequester;
    const { result } = setup(api, 'edit', { planId: PLAN_ID, draftId: DRAFT_ID });
    await waitFor(() => expect(result.current.editor.name).toBe('Força'));

    act(() => result.current.updateEditor((current) => ({ ...current, name: 'Força atualizada' })));

    let published = false;
    let duplicate = true;
    let publishPromise: Promise<boolean>;
    await act(async () => {
      publishPromise = result.current.publish();
      await Promise.resolve();
      duplicate = await result.current.publish();
    });
    expect(result.current.busy).toBe(true);
    expect(duplicate).toBe(false);
    expect(api.request).toHaveBeenNthCalledWith(3, `/workout-plan-drafts/${DRAFT_ID}/publish`, {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          name: 'Força atualizada',
          notes: 'Progressão semanal',
          days: [
            {
              label: 'Treino A',
              dayOrder: 0,
              exercises: [
                { exerciseId: EXERCISE_ID, exerciseOrder: 0, sets: 4, reps: '8-10', tempo: '3010' },
              ],
            },
            {
              label: 'Treino B',
              dayOrder: 1,
              exercises: [
                {
                  exerciseId: EXERCISE_ID,
                  exerciseOrder: 0,
                  sets: 3,
                  reps: '10',
                  restSeconds: 90,
                },
              ],
            },
          ],
        },
        revision: 4,
      }),
    });

    await act(async () => {
      resolvePublish(activePlanFixture('Força atualizada'));
      published = await publishPromise;
    });

    expect(published).toBe(true);
    expect(result.current.dirty).toBe(false);
    expect(api.request).toHaveBeenCalledTimes(3);
  });

  it('publica draft retomado sem exigir alteração local artificial', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(draftFixture())
      .mockResolvedValueOnce(activePlanFixture('Força'))
      .mockResolvedValueOnce(activePlanFixture('Força'));
    const api = { request } as unknown as ApiRequester;
    const { result } = setup(api, 'edit', { planId: PLAN_ID, draftId: DRAFT_ID });
    await waitFor(() => expect(result.current.draft?.revision).toBe(4));

    let published = false;
    await act(async () => {
      published = await result.current.publish();
    });

    expect(published).toBe(true);
    expect(request).toHaveBeenCalledTimes(3);
    expect(request).toHaveBeenCalledWith(
      `/workout-plan-drafts/${DRAFT_ID}/publish`,
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(request.mock.calls[2]?.[1]?.body as string) as {
      payload: { name: string };
      revision: number;
    };
    expect(body.payload.name).toBe('Força');
    expect(body.revision).toBe(4);
  });

  it('edita o plano ativo publicado a partir do draft sem tentar republicar o draft consumido', async () => {
    const publishedPlan = { ...activePlanFixture('Força'), id: PUBLISHED_PLAN_ID };
    const updatedPlan = { ...publishedPlan, name: 'Força atualizada' };
    const request = vi
      .fn()
      .mockResolvedValueOnce(draftFixture())
      .mockResolvedValueOnce(activePlanFixture('Força'))
      .mockResolvedValueOnce(publishedPlan)
      .mockResolvedValueOnce(updatedPlan);
    const api = { request } as unknown as ApiRequester;
    const { result } = setup(api, 'create', { draftId: DRAFT_ID });
    await waitFor(() => expect(result.current.draft?.revision).toBe(4));

    let published = false;
    await act(async () => {
      published = await result.current.publish();
    });
    expect(published).toBe(true);
    expect(result.current.plan?.id).toBe(PUBLISHED_PLAN_ID);
    expect(result.current.draftRecovered).toBe(false);

    act(() => result.current.changePlanField('name', 'Força atualizada'));
    let updated = false;
    await act(async () => {
      updated = await result.current.publish();
    });

    expect(updated).toBe(true);
    expect(request).toHaveBeenCalledWith(
      `/workout-plans/${PUBLISHED_PLAN_ID}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(result.current.plan?.name).toBe('Força atualizada');
    expect(result.current.dirty).toBe(false);
  });

  it('não substitui edição local quando chega refetch do plano', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce(activePlanFixture('Nome inicial'))
        .mockResolvedValueOnce(activePlanFixture('Nome remoto')),
    } as unknown as ApiRequester;
    const { result, queryClient } = setup(api, 'edit', { planId: PLAN_ID });
    await waitFor(() => expect(result.current.editor.name).toBe('Nome inicial'));

    act(() => result.current.updateEditor((current) => ({ ...current, name: 'Nome local' })));
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ['trainer', 'workout', PLAN_ID] });
    });

    expect(result.current.editor.name).toBe('Nome local');
    expect(result.current.dirty).toBe(true);
  });

  it('salva draft retomado com draftId e revisão exatos', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(draftFixture())
      .mockResolvedValueOnce(activePlanFixture('Força'))
      .mockResolvedValueOnce({ ...draftFixture(), revision: 5 });
    const api = { request } as unknown as ApiRequester;
    const { result } = setup(api, 'edit', { planId: PLAN_ID, draftId: DRAFT_ID });
    await waitFor(() => expect(result.current.editor.name).toBe('Força'));

    act(() => result.current.changePlanField('name', 'Força revisada'));

    let saved = false;
    await act(async () => {
      saved = await result.current.saveDraft();
    });

    expect(saved).toBe(true);
    const saveCall = request.mock.calls.find((call) => call[0] === '/workout-plan-drafts');
    expect(saveCall?.[1]?.body).toContain('"draftId":"00000000-0000-0000-0000-000000000501"');
    expect(saveCall?.[1]?.body).toContain('"revision":4');
    expect(api.request).not.toHaveBeenCalledWith(
      `/workout-plans/${PLAN_ID}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('mantém payload e revisão do draft hidratado juntos durante refetch dirty no save', async () => {
    const remoteDraft = {
      ...draftFixture(),
      revision: 5,
      payload: { ...draftFixture().payload, name: 'Força remota' },
    };
    const request = vi
      .fn()
      .mockResolvedValueOnce(draftFixture())
      .mockResolvedValueOnce(activePlanFixture('Força'))
      .mockResolvedValueOnce(remoteDraft)
      .mockRejectedValueOnce(new Error('conflito de revisão'));
    const api = { request } as unknown as ApiRequester;
    const { result, queryClient } = setup(api, 'edit', { planId: PLAN_ID, draftId: DRAFT_ID });
    await waitFor(() => expect(result.current.draft?.revision).toBe(4));
    act(() => result.current.changePlanField('name', 'Força local'));

    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: [...trainerWorkoutDraftQueryKey(AUTH_USER_ID, STUDENT_ID), DRAFT_ID],
      });
    });

    expect(result.current.editor.name).toBe('Força local');
    expect(result.current.draft?.revision).toBe(4);
    let saved = true;
    await act(async () => {
      saved = await result.current.saveDraft();
    });

    const saveCall = request.mock.calls.find((call) => call[0] === '/workout-plan-drafts');
    const body = JSON.parse(saveCall?.[1]?.body as string) as {
      payload: { name: string };
      revision: number;
    };
    expect(saved).toBe(false);
    expect(body.payload.name).toBe('Força local');
    expect(body.revision).toBe(4);
    expect(result.current.editor.name).toBe('Força local');
    expect(result.current.dirty).toBe(true);
  });

  it('mantém payload e revisão do draft hidratado juntos durante refetch dirty no publish', async () => {
    const remoteDraft = {
      ...draftFixture(),
      revision: 5,
      payload: { ...draftFixture().payload, name: 'Força remota' },
    };
    const request = vi
      .fn()
      .mockResolvedValueOnce(draftFixture())
      .mockResolvedValueOnce(activePlanFixture('Força'))
      .mockResolvedValueOnce(remoteDraft)
      .mockRejectedValueOnce(new Error('conflito de revisão'));
    const api = { request } as unknown as ApiRequester;
    const { result, queryClient } = setup(api, 'edit', { planId: PLAN_ID, draftId: DRAFT_ID });
    await waitFor(() => expect(result.current.draft?.revision).toBe(4));
    act(() => result.current.changePlanField('name', 'Força local'));

    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: [...trainerWorkoutDraftQueryKey(AUTH_USER_ID, STUDENT_ID), DRAFT_ID],
      });
    });

    expect(result.current.editor.name).toBe('Força local');
    expect(result.current.draft?.revision).toBe(4);
    let published = true;
    await act(async () => {
      published = await result.current.publish();
    });

    const publishCall = request.mock.calls.find(
      (call) => call[0] === `/workout-plan-drafts/${DRAFT_ID}/publish`,
    );
    const body = JSON.parse(publishCall?.[1]?.body as string) as {
      payload: { name: string };
      revision: number;
    };
    expect(published).toBe(false);
    expect(body.payload.name).toBe('Força local');
    expect(body.revision).toBe(4);
    expect(result.current.editor.name).toBe('Força local');
    expect(result.current.dirty).toBe(true);
  });

  it('adota payload e revisão remotos juntos ao descartar edição local após refetch dirty', async () => {
    const remoteDraft = {
      ...draftFixture(),
      revision: 5,
      payload: { ...draftFixture().payload, name: 'Força remota' },
    };
    const request = vi
      .fn()
      .mockResolvedValueOnce(draftFixture())
      .mockResolvedValueOnce(activePlanFixture('Força'))
      .mockResolvedValueOnce(remoteDraft);
    const api = { request } as unknown as ApiRequester;
    const { result, queryClient } = setup(api, 'edit', { planId: PLAN_ID, draftId: DRAFT_ID });
    await waitFor(() => expect(result.current.draft?.revision).toBe(4));
    act(() => result.current.changePlanField('name', 'Força local'));

    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: [...trainerWorkoutDraftQueryKey(AUTH_USER_ID, STUDENT_ID), DRAFT_ID],
      });
    });
    expect(result.current.editor.name).toBe('Força local');

    act(() => result.current.discardChanges());

    await waitFor(() => expect(result.current.editor.name).toBe('Força remota'));
    expect(result.current.draft?.revision).toBe(5);
    expect(result.current.dirty).toBe(false);
  });

  it('cria draft sem draftId nem revisão', async () => {
    const request = vi.fn().mockResolvedValueOnce(draftFixture());
    const api = { request } as unknown as ApiRequester;
    const { result } = setup(api, 'create');
    act(() => result.current.updateEditor(() => validEditorState()));
    act(() => result.current.setActiveDay('day-local-1'));

    let saved = false;
    await act(async () => {
      saved = await result.current.saveDraft();
    });

    const body = JSON.parse(request.mock.calls[0]?.[1]?.body as string) as Record<string, unknown>;
    expect(saved).toBe(true);
    expect(body).not.toHaveProperty('draftId');
    expect(body).not.toHaveProperty('revision');
  });

  it('preserva o plano ativo durante o save draft e trata falha de invalidação como sucesso confirmado', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(activePlanFixture('Força'))
      .mockResolvedValueOnce(draftFixture());
    const api = { request } as unknown as ApiRequester;
    const { result, queryClient } = setup(api, 'edit', { planId: PLAN_ID });
    await waitFor(() => expect(result.current.editor.name).toBe('Força'));
    act(() => result.current.changePlanField('name', 'Força revisada'));
    vi.spyOn(queryClient, 'invalidateQueries').mockRejectedValue(new Error('offline'));

    let saved = false;
    await act(async () => {
      saved = await result.current.saveDraft();
    });

    expect(saved).toBe(true);
    expect(result.current.feedback?.tone).toBe('success');
    expect(result.current.editor.name).toBe('Força revisada');
    expect(result.current.plan?.name).toBe('Força');
    expect(request).not.toHaveBeenCalledWith(
      `/workout-plans/${PLAN_ID}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(request.mock.calls.filter((call) => call[0] === '/workout-plan-drafts')).toHaveLength(1);
  });

  it('marca exercícios alterados ou reposicionados e limpa os marcadores ao restaurar baseline', async () => {
    const api = {
      request: vi.fn().mockResolvedValueOnce(activePlanFixture('Força')),
    } as unknown as ApiRequester;
    const { result } = setup(api, 'edit', { planId: PLAN_ID });
    await waitFor(() => expect(result.current.editor.name).toBe('Força'));
    const originalExerciseId = result.current.editor.days[0]?.exercises[0]?.localId;
    expect(originalExerciseId).toBeDefined();

    act(() =>
      result.current.changeExerciseField(
        result.current.editor.days[0]?.localId ?? '',
        originalExerciseId ?? '',
        'sets',
        '5',
      ),
    );

    expect(result.current.dirtyExerciseIds).toEqual([originalExerciseId]);
    act(() => result.current.discardChanges());
    expect(result.current.dirtyExerciseIds).toEqual([]);
  });

  it('mantém os valores depois de falha no save draft e permite retry sem publicar o plano', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(activePlanFixture('Força'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(draftFixture());
    const api = { request } as unknown as ApiRequester;
    const { result } = setup(api, 'edit', { planId: PLAN_ID });
    await waitFor(() => expect(result.current.editor.name).toBe('Força'));
    act(() => result.current.changePlanField('name', 'Força revisada'));

    let firstSave = true;
    await act(async () => {
      firstSave = await result.current.saveDraft();
    });

    expect(firstSave).toBe(false);
    expect(result.current.editor.name).toBe('Força revisada');
    expect(result.current.dirty).toBe(true);
    expect(result.current.feedback?.tone).toBe('error');

    let retry = false;
    await act(async () => {
      retry = await result.current.saveDraft();
    });

    expect(retry).toBe(true);
    expect(result.current.dirty).toBe(false);
    expect(result.current.feedback?.tone).toBe('success');
    expect(request.mock.calls.filter((call) => call[0] === '/workout-plan-drafts')).toHaveLength(2);
    expect(request).not.toHaveBeenCalledWith(
      `/workout-plans/${PLAN_ID}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('preserva dia ativo e foco quando um refetch limpo reidrata o plano', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(twoDayActivePlanFixture('Força'))
      .mockResolvedValueOnce(twoDayActivePlanFixture('Força atualizada'));
    const api = { request } as unknown as ApiRequester;
    const { result, queryClient } = setup(api, 'edit', { planId: PLAN_ID });
    await waitFor(() => expect(result.current.editor.days).toHaveLength(2));
    const selectedDayId = result.current.editor.days[1]?.localId;
    const selectedExerciseId = result.current.editor.days[1]?.exercises[0]?.localId;
    expect(selectedDayId).toBeDefined();
    expect(selectedExerciseId).toBeDefined();

    act(() => {
      if (selectedDayId) result.current.setActiveDay(selectedDayId);
      if (selectedExerciseId) result.current.setFocusedExercise(selectedExerciseId);
    });
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ['trainer', 'workout', PLAN_ID] });
    });

    await waitFor(() => expect(result.current.editor.name).toBe('Força atualizada'));
    expect(result.current.activeDay?.label).toBe('Treino B');
    expect(result.current.focusedExerciseId).toBe(result.current.activeDay?.exercises[0]?.localId);
  });

  it('restaura os valores sem perder o dia e o foco válidos ao descartar', async () => {
    const api = {
      request: vi.fn().mockResolvedValueOnce(twoDayActivePlanFixture('Força')),
    } as unknown as ApiRequester;
    const { result } = setup(api, 'edit', { planId: PLAN_ID });
    await waitFor(() => expect(result.current.editor.days).toHaveLength(2));
    const selectedDayId = result.current.editor.days[1]?.localId;
    const selectedExerciseId = result.current.editor.days[1]?.exercises[0]?.localId;
    expect(selectedDayId).toBeDefined();
    expect(selectedExerciseId).toBeDefined();

    act(() => {
      if (selectedDayId) result.current.setActiveDay(selectedDayId);
      if (selectedExerciseId) result.current.setFocusedExercise(selectedExerciseId);
    });
    act(() => {
      result.current.changePlanField('name', 'Força local');
      result.current.discardChanges();
    });

    expect(result.current.editor.name).toBe('Força');
    expect(result.current.activeDay?.label).toBe('Treino B');
    expect(result.current.focusedExerciseId).toBe(selectedExerciseId);
  });
});
