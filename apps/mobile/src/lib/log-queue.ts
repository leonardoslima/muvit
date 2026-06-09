import type { finishWorkoutLogSchema } from '@muvit/validators';
import type { z } from 'zod';
import type { ApiClient } from './api';

const QUEUE_KEY = 'muvit_pending_logs';

type FinishWorkoutLogInput = z.infer<typeof finishWorkoutLogSchema>;

export type PendingWorkoutLog = {
  workoutDayId: string;
  date: string;
  finish: FinishWorkoutLogInput;
};

export type QueueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export function createLogQueue(storage: QueueStorage) {
  async function read(): Promise<PendingWorkoutLog[]> {
    const raw = await storage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingWorkoutLog[]) : [];
  }

  async function write(items: PendingWorkoutLog[]): Promise<void> {
    if (items.length === 0) {
      await storage.removeItem(QUEUE_KEY);
      return;
    }
    await storage.setItem(QUEUE_KEY, JSON.stringify(items));
  }

  return {
    async enqueue(item: PendingWorkoutLog): Promise<void> {
      const items = await read();
      await write([...items, item]);
    },

    async drain(sender: (item: PendingWorkoutLog) => Promise<void>): Promise<void> {
      const items = await read();
      const remaining: PendingWorkoutLog[] = [];

      for (const item of items) {
        try {
          await sender(item);
        } catch {
          remaining.push(item);
        }
      }

      await write(remaining);
    },
  };
}

export async function sendPendingWorkoutLog(
  api: ApiClient,
  item: PendingWorkoutLog,
): Promise<void> {
  const started = await api.request<{ id: string }>('/workout-logs', {
    method: 'POST',
    body: JSON.stringify({ workoutDayId: item.workoutDayId, date: item.date }),
  });
  await api.request(`/workout-logs/${started.id}/finish`, {
    method: 'PATCH',
    body: JSON.stringify(item.finish),
  });
}
