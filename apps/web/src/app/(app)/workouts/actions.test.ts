import type { CreateWorkoutPlanInput } from '@muvit/validators';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorkoutPlanAction } from './actions';

const mocks = vi.hoisted(() => ({
  configureServerClient: vi.fn(),
  postWorkoutPlans: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({ configureServerClient: mocks.configureServerClient }));
vi.mock('@/lib/api/sdk.gen', () => ({ postWorkoutPlans: mocks.postWorkoutPlans }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

const input: CreateWorkoutPlanInput = {
  studentId: '11111111-1111-4111-8111-111111111111',
  name: 'Hipertrofia',
  startDate: '2026-08-11',
  status: 'active',
  days: [
    {
      label: 'Treino A',
      dayOrder: 0,
      exercises: [
        {
          exerciseId: '22222222-2222-4222-8222-222222222222',
          exerciseOrder: 0,
          sets: 4,
          reps: '8-12',
        },
      ],
    },
  ],
};

describe('createWorkoutPlanAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configureServerClient.mockResolvedValue({ name: 'client' });
    mocks.postWorkoutPlans.mockResolvedValue({
      data: { id: '33333333-3333-4333-8333-333333333333' },
      error: undefined,
    });
    mocks.redirect.mockImplementation((url: string) => {
      throw new Error(`redirect:${url}`);
    });
  });

  it('retorna erro discriminado quando o SDK responde com falha', async () => {
    mocks.postWorkoutPlans.mockResolvedValue({ data: undefined, error: { message: 'inválido' } });

    await expect(createWorkoutPlanAction(input)).resolves.toEqual({
      success: false,
      error: 'Não foi possível salvar o treino.',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('transforma rejeição do SDK em erro recuperável', async () => {
    mocks.postWorkoutPlans.mockRejectedValue(new Error('offline'));

    await expect(createWorkoutPlanAction(input)).resolves.toEqual({
      success: false,
      error: 'Não foi possível salvar o treino.',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('envia pelo SDK, revalida as rotas afetadas e redireciona no sucesso', async () => {
    await expect(createWorkoutPlanAction(input)).rejects.toThrow(
      'redirect:/workouts/33333333-3333-4333-8333-333333333333',
    );

    expect(mocks.postWorkoutPlans).toHaveBeenCalledWith({
      client: { name: 'client' },
      body: input,
    });
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      1,
      '/students/11111111-1111-4111-8111-111111111111',
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, '/workouts');
    expect(mocks.redirect).toHaveBeenCalledWith('/workouts/33333333-3333-4333-8333-333333333333');
  });
});
