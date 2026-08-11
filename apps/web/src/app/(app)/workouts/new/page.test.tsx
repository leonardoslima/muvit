import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewWorkoutPage from './page';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

describe('NewWorkoutPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserva o aluno ao redirecionar o fluxo legado para o construtor canônico', async () => {
    await expect(
      NewWorkoutPage({ searchParams: Promise.resolve({ studentId: 'student 1' }) }),
    ).rejects.toThrow('redirect:/workouts?studentId=student+1');

    expect(redirect).toHaveBeenCalledWith('/workouts?studentId=student+1');
  });

  it('redireciona para o construtor sem query quando não há aluno', async () => {
    await expect(NewWorkoutPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'redirect:/workouts',
    );
  });
});
