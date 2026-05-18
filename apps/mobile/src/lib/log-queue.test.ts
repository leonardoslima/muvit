import { describe, expect, it, vi } from 'vitest';
import { type PendingWorkoutLog, type QueueStorage, createLogQueue } from './log-queue';

function memoryStorage(seed: Record<string, string | null> = {}): QueueStorage {
  const values = new Map(Object.entries(seed));
  return {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
  };
}

const pending: PendingWorkoutLog = {
  workoutDayId: 'day-1',
  date: '2026-05-12',
  finish: {
    durationMin: 45,
    completed: true,
    sets: [{ workoutExerciseId: 'we-1', setNumber: 1, repsDone: 10, completed: true }],
  },
};

describe('createLogQueue', () => {
  it('enfileira logs pendentes em storage persistente', async () => {
    const storage = memoryStorage();
    const queue = createLogQueue(storage);

    await queue.enqueue(pending);

    expect(storage.setItem).toHaveBeenCalledWith('muvit_pending_logs', JSON.stringify([pending]));
  });

  it('drena a fila e remove storage quando todos os envios passam', async () => {
    const storage = memoryStorage({ muvit_pending_logs: JSON.stringify([pending]) });
    const queue = createLogQueue(storage);
    const sender = vi.fn(async () => undefined);

    await queue.drain(sender);

    expect(sender).toHaveBeenCalledWith(pending);
    expect(storage.removeItem).toHaveBeenCalledWith('muvit_pending_logs');
  });
});
