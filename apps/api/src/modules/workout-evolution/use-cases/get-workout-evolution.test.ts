import { describe, expect, it } from 'vitest';
import { GetWorkoutEvolutionUseCase } from './get-workout-evolution.js';

describe('evolução de treinos', () => {
  it.each([
    {
      name: 'conta a semana atual e semanas anteriores consecutivas',
      date: '2026-10-17',
      weeks: [
        { weekStart: '2026-10-12', completed: 32 },
        { weekStart: '2026-10-05', completed: 1 },
        { weekStart: '2026-09-28', completed: 2 },
      ],
      streakWeeks: 3,
      completedThisWeek: 32,
    },
    {
      name: 'preserva a sequência anterior quando a segunda-feira ainda não tem treino',
      date: '2026-10-12',
      weeks: [
        { weekStart: '2026-10-05', completed: 1 },
        { weekStart: '2026-09-28', completed: 1 },
      ],
      streakWeeks: 2,
      completedThisWeek: 0,
    },
    {
      name: 'interrompe na primeira semana vazia',
      date: '2026-10-17',
      weeks: [
        { weekStart: '2026-10-12', completed: 1 },
        { weekStart: '2026-09-28', completed: 1 },
      ],
      streakWeeks: 1,
      completedThisWeek: 1,
    },
    {
      name: 'zera quando nem a semana anterior tem treino',
      date: '2026-10-17',
      weeks: [{ weekStart: '2026-09-21', completed: 1 }],
      streakWeeks: 0,
      completedThisWeek: 0,
    },
    {
      name: 'atravessa a virada do ano sem depender do timezone',
      date: '2027-01-04',
      weeks: [
        { weekStart: '2026-12-28', completed: 1 },
        { weekStart: '2027-01-04', completed: 1 },
      ],
      streakWeeks: 2,
      completedThisWeek: 1,
    },
    {
      name: 'aceita ausência de histórico',
      date: '2026-10-17',
      weeks: [],
      streakWeeks: 0,
      completedThisWeek: 0,
    },
  ])('$name', async ({ date, weeks, streakWeeks, completedThisWeek }) => {
    const useCase = new GetWorkoutEvolutionUseCase({
      getWeeklySummary: async (studentId: string, requestedDate: string) => {
        expect(studentId).toBe('student-profile');
        expect(requestedDate).toBe(date);
        return { weeks, weeklyGoal: null };
      },
    });

    expect(await useCase.execute('student-profile', { date })).toEqual({
      streakWeeks,
      completedThisWeek,
      weeklyGoal: null,
    });
  });

  it('mantém a meta explícita independente da quantidade de treinos concluídos', async () => {
    const useCase = new GetWorkoutEvolutionUseCase({
      getWeeklySummary: async () => ({
        weeks: [{ weekStart: '2026-10-12', completed: 1 }],
        weeklyGoal: 7,
      }),
    });

    expect(await useCase.execute('student-profile', { date: '2026-10-17' })).toEqual({
      streakWeeks: 1,
      completedThisWeek: 1,
      weeklyGoal: 7,
    });
  });
});
