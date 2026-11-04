import type { SaveWorkoutPlanDraftInput } from '@muvit/validators';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  type SaveTrainerWorkoutDraftRequest,
  createTrainerWorkoutPlan,
  getTrainerWorkoutDraft,
  getTrainerWorkoutPlan,
  listTrainerWorkoutDrafts,
  listTrainerWorkoutPlans,
  publishTrainerWorkoutDraft,
  saveTrainerWorkoutDraft,
  trainerWorkoutDraftQueryKey,
  updateTrainerWorkoutPlan,
} from './trainer-workout-data';

describe('trainer-workout-data', () => {
  it('lista planos pelo aluno e encaminha signal', async () => {
    const api = { request: vi.fn().mockResolvedValue({ items: [] }) };
    const signal = new AbortController().signal;

    await listTrainerWorkoutPlans(api, 'student/1', signal);

    expect(api.request).toHaveBeenCalledWith('/students/student%2F1/workout-plans', { signal });
  });

  it('carrega o detalhe com planId codificado', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'plan-1' }) };
    const signal = new AbortController().signal;

    await getTrainerWorkoutPlan(api, 'plan/1', signal);

    expect(api.request).toHaveBeenCalledWith('/workout-plans/plan%2F1', { signal });
  });

  it('cria plano com body exato sem trainerId', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'plan-1' }) };
    const input = {
      studentId: '00000000-0000-0000-0000-000000000001',
      name: 'Hipertrofia',
      status: 'draft' as const,
      days: [
        {
          label: 'Treino A',
          dayOrder: 0,
          exercises: [
            {
              exerciseId: '00000000-0000-0000-0000-000000000101',
              exerciseOrder: 0,
              sets: 3,
              reps: '10',
            },
          ],
        },
      ],
    };

    await createTrainerWorkoutPlan(api, input);

    expect(api.request).toHaveBeenCalledWith('/workout-plans', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(JSON.stringify(api.request.mock.calls)).not.toContain('trainerId');
  });

  it('edita plano sem enviar studentId ou trainerId', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'plan-1' }) };
    const input = {
      name: 'Hipertrofia revisada',
      status: 'active' as const,
      notes: '',
      days: [
        {
          label: 'Treino A',
          dayOrder: 0,
          exercises: [
            {
              exerciseId: '00000000-0000-0000-0000-000000000101',
              exerciseOrder: 0,
              sets: 4,
              reps: '8-10',
              tempo: '3010',
            },
          ],
        },
      ],
    };

    await updateTrainerWorkoutPlan(api, 'plan/1', input);

    expect(api.request).toHaveBeenCalledWith('/workout-plans/plan%2F1', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    expect(JSON.stringify(api.request.mock.calls)).not.toContain('studentId');
    expect(JSON.stringify(api.request.mock.calls)).not.toContain('trainerId');
  });

  it('lista rascunhos do aluno com caminho codificado e signal', async () => {
    const api = { request: vi.fn().mockResolvedValue({ items: [] }) };
    const signal = new AbortController().signal;

    await listTrainerWorkoutDrafts(api, 'student/1', signal);

    expect(api.request).toHaveBeenCalledWith('/students/student%2F1/workout-plan-drafts', {
      signal,
    });
  });

  it('carrega rascunho com ID codificado e signal', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'draft-1' }) };
    const signal = new AbortController().signal;

    await getTrainerWorkoutDraft(api, 'draft/1', signal);

    expect(api.request).toHaveBeenCalledWith('/workout-plan-drafts/draft%2F1', { signal });
  });

  it('salva rascunho com POST e corpo integral', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'draft-1' }) };
    const input = {
      studentId: '00000000-0000-0000-0000-000000000001',
      payload: {
        name: 'Hipertrofia',
        days: [
          {
            label: 'Treino A',
            dayOrder: 0,
            exercises: [
              {
                exerciseId: '00000000-0000-0000-0000-000000000101',
                exerciseOrder: 0,
                sets: 3,
                reps: '10',
              },
            ],
          },
        ],
      },
      selectedDayOrder: 0,
    };

    await saveTrainerWorkoutDraft(api, input);

    expect(api.request).toHaveBeenCalledWith('/workout-plan-drafts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(JSON.parse(api.request.mock.calls[0]?.[1]?.body as string)).not.toHaveProperty(
      'draftId',
    );
    expect(JSON.parse(api.request.mock.calls[0]?.[1]?.body as string)).not.toHaveProperty(
      'revision',
    );
  });

  it('atualiza rascunho com POST e preserva draftId e revision no corpo', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'draft-1', revision: 5 }) };
    const input = {
      studentId: '00000000-0000-0000-0000-000000000001',
      draftId: '00000000-0000-0000-0000-000000000301',
      payload: {
        name: 'Hipertrofia revisada',
        days: [
          {
            label: 'Treino A',
            dayOrder: 0,
            exercises: [
              {
                exerciseId: '00000000-0000-0000-0000-000000000101',
                exerciseOrder: 0,
                sets: 4,
                reps: '8-10',
              },
            ],
          },
        ],
      },
      selectedDayOrder: 0,
      revision: 4,
    };

    await saveTrainerWorkoutDraft(api, input);

    expect(api.request).toHaveBeenCalledWith('/workout-plan-drafts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(JSON.parse(api.request.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      draftId: input.draftId,
      revision: input.revision,
    });
  });

  it('tipa criação sem par de revisão e atualização com ambos os campos', () => {
    type CreationInput = Omit<SaveWorkoutPlanDraftInput, 'draftId' | 'revision'>;
    type UpdateInput = CreationInput & {
      draftId: NonNullable<SaveWorkoutPlanDraftInput['draftId']>;
      revision: NonNullable<SaveWorkoutPlanDraftInput['revision']>;
    };

    expectTypeOf<SaveTrainerWorkoutDraftRequest>().toEqualTypeOf<CreationInput | UpdateInput>();
  });

  it('publica rascunho com ID codificado, POST e corpo integral', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'plan-1', status: 'active' }) };
    const input = {
      payload: {
        name: 'Hipertrofia',
        days: [
          {
            label: 'Treino A',
            dayOrder: 0,
            exercises: [
              {
                exerciseId: '00000000-0000-0000-0000-000000000101',
                exerciseOrder: 0,
                sets: 3,
                reps: '10',
              },
            ],
          },
        ],
      },
      revision: 2,
    };

    await publishTrainerWorkoutDraft(api, 'draft/1', input);

    expect(api.request).toHaveBeenCalledWith('/workout-plan-drafts/draft%2F1/publish', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('particiona a chave de drafts por identidade e aluno', () => {
    expect(trainerWorkoutDraftQueryKey('auth-1', 'student-1')).toEqual([
      'trainer-workout-drafts',
      'auth-1',
      'student-1',
    ]);
    expect(trainerWorkoutDraftQueryKey('auth-2', 'student-1')).not.toEqual(
      trainerWorkoutDraftQueryKey('auth-1', 'student-1'),
    );
  });
});
