import { describe, expect, it, vi } from 'vitest';
import { loadTodayWorkout } from './today-workout';

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
