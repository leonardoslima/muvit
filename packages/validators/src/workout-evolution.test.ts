import { describe, expect, it } from 'vitest';
import {
  updateWorkoutGoalSchema,
  workoutEvolutionQuerySchema,
  workoutEvolutionSchema,
  workoutGoalSchema,
} from './index';

describe('consulta de evolução de treinos', () => {
  it('aceita uma data local válida, incluindo ano bissexto', () => {
    expect(workoutEvolutionQuerySchema.parse({ date: '2024-02-29' })).toEqual({
      date: '2024-02-29',
    });
  });

  it.each([
    {},
    { date: null },
    { date: '2025-02-29' },
    { date: '2026-13-01' },
    {
      date: '2026-10-17T00:00:00Z',
    },
  ])('rejeita data ausente ou inválida: %j', (input: unknown) => {
    expect(workoutEvolutionQuerySchema.safeParse(input).success).toBe(false);
  });
});

describe('resumo de evolução de treinos', () => {
  it('aceita contadores zerados e meta não configurada', () => {
    expect(
      workoutEvolutionSchema.parse({
        streakWeeks: 0,
        completedThisWeek: 0,
        weeklyGoal: null,
      }),
    ).toEqual({ streakWeeks: 0, completedThisWeek: 0, weeklyGoal: null });
  });

  it('aceita contagem semanal acima da meta sem limitar o histórico', () => {
    expect(
      workoutEvolutionSchema.safeParse({
        streakWeeks: 52,
        completedThisWeek: 9,
        weeklyGoal: 7,
      }).success,
    ).toBe(true);
  });

  it.each([
    { streakWeeks: -1, completedThisWeek: 0, weeklyGoal: null },
    { streakWeeks: 1.5, completedThisWeek: 0, weeklyGoal: null },
    { streakWeeks: 0, completedThisWeek: -1, weeklyGoal: null },
    { streakWeeks: 0, completedThisWeek: 1.5, weeklyGoal: null },
    { streakWeeks: 0, completedThisWeek: 0 },
    { streakWeeks: 0, completedThisWeek: 0, weeklyGoal: 0 },
    { streakWeeks: 0, completedThisWeek: 0, weeklyGoal: 8 },
  ])('rejeita resumo inválido: %j', (input: unknown) => {
    expect(workoutEvolutionSchema.safeParse(input).success).toBe(false);
  });
});

describe.each([
  ['resposta', workoutGoalSchema],
  ['atualização', updateWorkoutGoalSchema],
])('meta semanal: %s', (_name: string, schema: typeof workoutGoalSchema) => {
  it.each([1, 4, 7, null])('aceita meta %j', (weeklyGoal: number | null) => {
    expect(schema.parse({ weeklyGoal })).toEqual({ weeklyGoal });
  });

  it.each([0, 8, -1, 1.5, '3', undefined])('rejeita meta %j', (weeklyGoal: unknown) => {
    expect(schema.safeParse({ weeklyGoal }).success).toBe(false);
  });

  it('exige weeklyGoal explicitamente, inclusive para remover a configuração', () => {
    expect(schema.safeParse({}).success).toBe(false);
  });
});
