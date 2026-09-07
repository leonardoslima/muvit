import { describe, expect, it, vi } from 'vitest';
import {
  createTrainerWorkoutPlan,
  getTrainerWorkoutPlan,
  listTrainerWorkoutPlans,
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
});
