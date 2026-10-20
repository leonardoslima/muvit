import { describe, expect, it, vi } from 'vitest';
import { loadWorkoutEvolution } from './workout-evolution';

describe('resumo de evolução recebido da API', () => {
  it('consulta uma única resposta agregada e preserva o sinal de cancelamento', async () => {
    const summary = { streakWeeks: 3, completedThisWeek: 2, weeklyGoal: 4 };
    const request = vi.fn().mockResolvedValue(summary);
    const signal = new AbortController().signal;
    expect(await loadWorkoutEvolution({ api: { request }, today: '2026-10-17', signal })).toEqual(
      summary,
    );
    expect(request).toHaveBeenCalledExactlyOnceWith(
      '/students/me/workout-evolution?date=2026-10-17',
      { signal },
    );
  });

  it('mantém meta ausente distinta de uma contagem zero', async () => {
    const summary = { streakWeeks: 0, completedThisWeek: 0, weeklyGoal: null };
    expect(
      await loadWorkoutEvolution({
        api: { request: vi.fn().mockResolvedValue(summary) },
        today: '2026-10-17',
      }),
    ).toEqual(summary);
  });

  it('rejeita respostas inválidas em vez de calcular números a partir de dados parciais', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ streakWeeks: 3, completedThisWeek: -1, weeklyGoal: 8 });
    await expect(loadWorkoutEvolution({ api: { request }, today: '2026-10-17' })).rejects.toThrow();
  });
});
