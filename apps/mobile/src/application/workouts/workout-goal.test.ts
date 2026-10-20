import { describe, expect, it, vi } from 'vitest';
import { loadWorkoutGoal, saveWorkoutGoal } from './workout-goal';

describe('transporte da meta semanal', () => {
  it('carrega a preferência self-scoped e encaminha cancelamento', async () => {
    const request = vi.fn().mockResolvedValue({ weeklyGoal: null });
    const signal = new AbortController().signal;
    expect(await loadWorkoutGoal({ request }, signal)).toEqual({ weeklyGoal: null });
    expect(request).toHaveBeenCalledExactlyOnceWith('/students/me/workout-goal', { signal });
  });

  it.each([1, 7, null])(
    'salva a meta %j sem confundir remoção com zero',
    async (weeklyGoal: number | null) => {
      const request = vi.fn().mockResolvedValue({ weeklyGoal });
      expect(await saveWorkoutGoal({ request }, weeklyGoal)).toEqual({ weeklyGoal });
      expect(request).toHaveBeenCalledExactlyOnceWith('/students/me/workout-goal', {
        method: 'PATCH',
        body: JSON.stringify({ weeklyGoal }),
      });
    },
  );

  it.each([0, 8, 1.5])('rejeita meta inválida %j antes da rede', async (weeklyGoal: number) => {
    const request = vi.fn();
    await expect(saveWorkoutGoal({ request }, weeklyGoal)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it.each([{}, { weeklyGoal: 8 }, { weeklyGoal: '3' }])(
    'rejeita resposta inválida %j',
    async (response: unknown) => {
      const request = vi.fn().mockResolvedValue(response);
      await expect(loadWorkoutGoal({ request })).rejects.toThrow();
      await expect(saveWorkoutGoal({ request }, 3)).rejects.toThrow();
    },
  );

  it('propaga falha de rede ao carregar e salvar', async () => {
    const request = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(loadWorkoutGoal({ request })).rejects.toThrow('offline');
    await expect(saveWorkoutGoal({ request }, null)).rejects.toThrow('offline');
  });
});
