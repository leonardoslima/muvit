import { describe, expect, it, vi } from 'vitest';
import {
  buildFinishWorkoutLogInput,
  buildInitialSets,
  finishWorkoutWithOfflineFallback,
  groupSetsByExercise,
  toOptionalNumber,
} from './workout-log';

const workoutExercise = {
  id: 'workout-exercise-id',
  sets: 2,
  loadKg: 40,
};

describe('workout log service', () => {
  it('builds initial set state from workout exercises', () => {
    expect(buildInitialSets([workoutExercise])).toEqual([
      {
        workoutExerciseId: 'workout-exercise-id',
        setNumber: 1,
        repsDone: '',
        loadKg: '40',
        completed: false,
      },
      {
        workoutExerciseId: 'workout-exercise-id',
        setNumber: 2,
        repsDone: '',
        loadKg: '40',
        completed: false,
      },
    ]);
  });

  it('groups sets by workout exercise id', () => {
    const sets = buildInitialSets([workoutExercise]);

    expect(groupSetsByExercise(sets).get('workout-exercise-id')).toHaveLength(2);
  });

  it('normalizes optional numbers', () => {
    expect(toOptionalNumber('10,5')).toBe(10.5);
    expect(toOptionalNumber('abc')).toBeUndefined();
    expect(toOptionalNumber(' ')).toBeUndefined();
  });

  it('queues workout log when online send fails', async () => {
    const queue = { enqueue: vi.fn().mockResolvedValue(undefined) };
    const send = vi.fn().mockRejectedValue(new Error('offline'));
    const sets = [
      {
        workoutExerciseId: 'workout-exercise-id',
        setNumber: 1,
        repsDone: '10',
        loadKg: '40',
        completed: true,
      },
    ];

    await expect(
      finishWorkoutWithOfflineFallback({
        api: {},
        queue,
        send,
        workoutDayId: 'day-id',
        date: '2026-06-11',
        sets,
      }),
    ).resolves.toEqual({ queued: true });

    expect(queue.enqueue).toHaveBeenCalledWith({
      workoutDayId: 'day-id',
      date: '2026-06-11',
      finish: buildFinishWorkoutLogInput(sets),
    });
  });

  it('sends workout log without queueing when online send succeeds', async () => {
    const api = { request: vi.fn() };
    const queue = { enqueue: vi.fn().mockResolvedValue(undefined) };
    const send = vi.fn().mockResolvedValue(undefined);
    const sets = [
      {
        workoutExerciseId: 'workout-exercise-id',
        setNumber: 1,
        repsDone: '10',
        loadKg: '40',
        completed: true,
      },
    ];

    await expect(
      finishWorkoutWithOfflineFallback({
        api,
        queue,
        send,
        workoutDayId: 'day-id',
        date: '2026-06-11',
        sets,
      }),
    ).resolves.toEqual({ queued: false });

    expect(send).toHaveBeenCalledWith(api, {
      workoutDayId: 'day-id',
      date: '2026-06-11',
      finish: buildFinishWorkoutLogInput(sets),
    });
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
