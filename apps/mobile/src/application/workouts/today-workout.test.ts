import { describe, expect, it, vi } from 'vitest';
import { loadTodayWorkout, loadWorkoutDay } from './today-workout';

describe('loadTodayWorkout', () => {
  it('returns null when there is no active plan', async () => {
    const api = {
      request: vi.fn().mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'draft' }] }),
    };

    await expect(loadTodayWorkout({ api, userId: 'student-id' })).resolves.toBeNull();
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

    await expect(loadTodayWorkout({ api, userId: 'student-id' })).resolves.toMatchObject({
      day: { id: 'day-b' },
    });
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

    await expect(
      loadWorkoutDay({ api, userId: 'student-id', dayId: 'day-b' }),
    ).resolves.toMatchObject({ id: 'day-b' });
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

    await expect(
      loadWorkoutDay({ api, userId: 'student-id', dayId: 'day-a' }),
    ).resolves.toMatchObject({ id: 'day-a' });
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

    await expect(
      loadWorkoutDay({ api, userId: 'student-id', dayId: 'missing-day' }),
    ).rejects.toThrow('dia nao encontrado');
  });
});
