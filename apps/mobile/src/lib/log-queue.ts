import { finishWorkoutLogSchema } from '@muvit/validators';
import { z } from 'zod';
import type { ApiRequester } from './api';

const JOURNAL_KEY = 'muvit_workout_log_journal';

export type QueueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const workoutLogStageSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create') }).strict(),
  z.object({ kind: z.literal('finish'), workoutLogId: z.string().min(1) }).strict(),
  z.object({ kind: z.literal('terminal') }).strict(),
]);

const workoutLogOperationSchema = z
  .object({
    version: z.literal(1),
    operationId: z.string().min(1),
    ownerAuthUserId: z.string().min(1),
    workoutDayId: z.string().min(1),
    date: z.string().date(),
    finish: finishWorkoutLogSchema,
    stage: workoutLogStageSchema,
  })
  .strict();

const workoutLogJournalSchema = z.array(workoutLogOperationSchema);

export type WorkoutLogOperation = z.infer<typeof workoutLogOperationSchema>;

export type WorkoutLogJournal = {
  ensure: (operation: WorkoutLogOperation) => Promise<WorkoutLogOperation>;
  get: (operationId: string) => Promise<WorkoutLogOperation | null>;
  hasForDay: (ownerAuthUserId: string, date: string, workoutDayId: string) => Promise<boolean>;
  drain: (ownerAuthUserId: string, bindRequester: () => ApiRequester) => Promise<void>;
  pruneTerminalsBefore: (ownerAuthUserId: string, date: string) => Promise<void>;
};

export function createWorkoutLogJournal(storage: QueueStorage): WorkoutLogJournal {
  let serializationTail: Promise<void> = Promise.resolve();

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = serializationTail.then(
      () => operation(),
      () => operation(),
    );
    serializationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function read(): Promise<WorkoutLogOperation[]> {
    const raw = await storage.getItem(JOURNAL_KEY);
    if (raw === null) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new Error('Journal de conclusão inválido.');
    }

    const result = workoutLogJournalSchema.safeParse(parsed);
    if (!result.success) throw new Error('Journal de conclusão inválido.');
    return result.data;
  }

  async function write(operations: WorkoutLogOperation[]): Promise<void> {
    if (operations.length === 0) {
      await storage.removeItem(JOURNAL_KEY);
      return;
    }
    await storage.setItem(JOURNAL_KEY, JSON.stringify(operations));
  }

  async function persistStage(
    operations: WorkoutLogOperation[],
    operation: WorkoutLogOperation,
    stage: WorkoutLogOperation['stage'],
  ): Promise<WorkoutLogOperation[]> {
    const advanced = workoutLogOperationSchema.parse({ ...operation, stage });
    const next = operations.map((candidate) =>
      candidate.operationId === operation.operationId ? advanced : candidate,
    );
    await write(next);
    return next;
  }

  return {
    ensure(operation) {
      return serialize(async () => {
        const validated = workoutLogOperationSchema.parse(operation);
        const operations = await read();
        const existing = operations.find(
          (candidate) => candidate.operationId === validated.operationId,
        );
        if (existing) return existing;

        await write([...operations, validated]);
        return validated;
      });
    },

    get(operationId) {
      return serialize(async () => {
        const operations = await read();
        return operations.find((operation) => operation.operationId === operationId) ?? null;
      });
    },

    hasForDay(ownerAuthUserId, date, workoutDayId) {
      return serialize(async () => {
        const operations = await read();
        return operations.some(
          (operation) =>
            operation.ownerAuthUserId === ownerAuthUserId &&
            operation.date === date &&
            operation.workoutDayId === workoutDayId,
        );
      });
    },

    drain(ownerAuthUserId, bindRequester) {
      return serialize(async () => {
        let operations = await read();

        for (const candidate of operations) {
          if (
            candidate.ownerAuthUserId !== ownerAuthUserId ||
            candidate.stage.kind === 'terminal'
          ) {
            continue;
          }

          try {
            const requester = bindRequester();
            let current = candidate;

            if (current.stage.kind === 'create') {
              const started = await requester.request<{ id: string }>('/workout-logs', {
                method: 'POST',
                body: JSON.stringify({ workoutDayId: current.workoutDayId, date: current.date }),
              });
              operations = await persistStage(operations, current, {
                kind: 'finish',
                workoutLogId: started.id,
              });
              current = {
                ...current,
                stage: { kind: 'finish', workoutLogId: started.id },
              };
            }

            if (current.stage.kind === 'finish') {
              await requester.request(`/workout-logs/${current.stage.workoutLogId}/finish`, {
                method: 'PATCH',
                body: JSON.stringify(current.finish),
              });
              operations = await persistStage(operations, current, { kind: 'terminal' });
            }
          } catch {
            // A etapa já persistida permanece disponível para o próximo drain.
          }
        }
      });
    },

    pruneTerminalsBefore(ownerAuthUserId, date) {
      return serialize(async () => {
        const operations = await read();
        const retained = operations.filter(
          (operation) =>
            operation.ownerAuthUserId !== ownerAuthUserId ||
            operation.stage.kind !== 'terminal' ||
            operation.date >= date,
        );
        if (retained.length === operations.length) return;
        await write(retained);
      });
    },
  };
}
