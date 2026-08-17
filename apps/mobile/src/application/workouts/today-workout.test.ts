import { describe, expect, it, vi } from 'vitest';
import {
  estimateWorkoutDuration,
  loadTodayWorkout,
  loadWorkoutDay,
  normalizeCachedTodayWorkout,
  selectNextWorkoutDay,
} from './today-workout';

const cachedPlan = { id: 'plan-id', name: 'Plano', days: [] };
const cachedDay = {
  id: 'day-id',
  label: 'Treino A',
  dayOrder: 0,
  planId: 'plan-id',
  exercises: [],
};

describe('cache do treino de hoje', () => {
  it('normaliza os estados atuais e o formato legado do cache', () => {
    expect(normalizeCachedTodayWorkout(null)).toEqual({ status: 'no-active-plan' });
    expect(normalizeCachedTodayWorkout({ status: 'no-active-plan' })).toEqual({
      status: 'no-active-plan',
    });
    expect(
      normalizeCachedTodayWorkout({ status: 'available', plan: cachedPlan, day: cachedDay }),
    ).toMatchObject({ status: 'available', day: cachedDay });
    expect(
      normalizeCachedTodayWorkout({ status: 'no-workout-today', plan: cachedPlan }),
    ).toMatchObject({ status: 'no-workout-today', plan: cachedPlan });
    expect(normalizeCachedTodayWorkout({ plan: cachedPlan, day: cachedDay })).toMatchObject({
      status: 'available',
      day: cachedDay,
    });
    expect(normalizeCachedTodayWorkout({ cached: true })).toEqual({ status: 'no-active-plan' });
  });

  it('estima pelo menos um minuto quando o treino está vazio', () => {
    expect(estimateWorkoutDuration(cachedDay)).toBe(1);
  });
});

describe('loadTodayWorkout', () => {
  it('returns no-active-plan before requesting plan details', async () => {
    const api = {
      request: vi.fn().mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'draft' }] }),
    };

    await expect(loadTodayWorkout({ api })).resolves.toEqual({ status: 'no-active-plan' });
    expect(api.request).toHaveBeenCalledOnce();
  });

  it('selects the first non-completed day from the active plan', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
        .mockResolvedValueOnce({
          id: 'plan-id',
          name: 'Plano',
          days: [
            { id: 'day-a', label: 'A', exercises: [] },
            { id: 'day-b', label: 'B', exercises: [] },
          ],
        })
        .mockResolvedValueOnce({ items: [{ workoutDayId: 'day-a', completed: true }] }),
    };

    await expect(loadTodayWorkout({ api })).resolves.toMatchObject({
      status: 'available',
      day: { id: 'day-b' },
    });
  });

  it('returns no-workout-today when the active plan has no days', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
        .mockResolvedValueOnce({ id: 'plan-id', name: 'Plano', days: [] })
        .mockResolvedValueOnce({ items: [] }),
    };

    await expect(loadTodayWorkout({ api })).resolves.toMatchObject({
      status: 'no-workout-today',
      plan: { id: 'plan-id' },
    });
  });
});

describe('selectNextWorkoutDay', () => {
  it('wraps to the first day when every day was completed', () => {
    const days = [
      { id: 'day-a', label: 'A', dayOrder: 0, planId: 'plan-id', exercises: [] },
      { id: 'day-b', label: 'B', dayOrder: 1, planId: 'plan-id', exercises: [] },
    ];

    expect(
      selectNextWorkoutDay(days, [
        { workoutDayId: 'day-a', completed: true },
        { workoutDayId: 'day-b', completed: true },
        { workoutDayId: 'ignored', completed: false },
      ]),
    ).toEqual(days[0]);
  });
});

describe('loadWorkoutDay', () => {
  it('loads the requested day from the active plan', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({
          items: [
            { id: 'draft-plan-id', status: 'draft' },
            { id: 'active-plan-id', status: 'active' },
          ],
        })
        .mockResolvedValueOnce({
          id: 'active-plan-id',
          name: 'Plano ativo',
          days: [
            { id: 'day-a', label: 'A', exercises: [] },
            { id: 'day-b', label: 'B', exercises: [] },
          ],
        }),
    };

    await expect(loadWorkoutDay({ api, dayId: 'day-b' })).resolves.toMatchObject({ id: 'day-b' });
    expect(api.request).toHaveBeenNthCalledWith(2, '/workout-plans/active-plan-id');
  });

  it('falls back to the first plan when there is no active plan', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({
          items: [
            { id: 'first-plan-id', status: 'draft' },
            { id: 'second-plan-id', status: 'paused' },
          ],
        })
        .mockResolvedValueOnce({
          id: 'first-plan-id',
          name: 'Plano inicial',
          days: [{ id: 'day-a', label: 'A', exercises: [] }],
        }),
    };

    await expect(loadWorkoutDay({ api, dayId: 'day-a' })).resolves.toMatchObject({ id: 'day-a' });
    expect(api.request).toHaveBeenNthCalledWith(2, '/workout-plans/first-plan-id');
  });

  it('rejects when the requested day is not found', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
        .mockResolvedValueOnce({
          id: 'plan-id',
          name: 'Plano',
          days: [{ id: 'day-a', label: 'A', exercises: [] }],
        }),
    };

    await expect(loadWorkoutDay({ api, dayId: 'missing-day' })).rejects.toThrow(
      'dia não encontrado',
    );
  });

  it('rejects when there is no workout plan to load from', async () => {
    const api = {
      request: vi.fn().mockResolvedValueOnce({ items: [] }),
    };

    await expect(loadWorkoutDay({ api, dayId: 'day-a' })).rejects.toThrow('sem plano');
  });
});
