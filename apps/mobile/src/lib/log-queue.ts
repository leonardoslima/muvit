import { finishWorkoutLogSchema } from '@muvit/validators';
import { z } from 'zod';
import { ApiError, type ApiRequester } from './api';

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

const journalWorkoutLogSetSchema = finishWorkoutLogSchema.shape.sets.element.strict();
const journalFinishWorkoutLogSchema = finishWorkoutLogSchema
  .extend({ sets: z.array(journalWorkoutLogSetSchema).min(1) })
  .strict();

const workoutLogOperationSchema = z
  .object({
    version: z.literal(1),
    operationId: z.string().min(1),
    ownerAuthUserId: z.string().min(1),
    workoutDayId: z.string().min(1),
    date: z.string().date(),
    finish: journalFinishWorkoutLogSchema,
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
  removeTerminal: (ownerAuthUserId: string, date: string, workoutDayId: string) => Promise<void>;
};

let journalStorageTail: Promise<void> = Promise.resolve();
let journalDrainTail: Promise<void> = Promise.resolve();

function serializeStorageOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = journalStorageTail.then(
    () => operation(),
    () => operation(),
  );
  journalStorageTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function serializeDrain(operation: () => Promise<void>): Promise<void> {
  const result = journalDrainTail.then(operation, operation);
  journalDrainTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function isAlreadyCompletedConflict(error: unknown): boolean {
  return (
    error instanceof ApiError && error.status === 409 && error.message === 'log already completed'
  );
}

export function createWorkoutLogJournal(storage: QueueStorage): WorkoutLogJournal {
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

  function readOperation(operationId: string): Promise<WorkoutLogOperation | null> {
    return serializeStorageOperation(async () => {
      const operations = await read();
      return operations.find((operation) => operation.operationId === operationId) ?? null;
    });
  }

  function persistStage(
    operationId: string,
    expectedStage: WorkoutLogOperation['stage']['kind'],
    stage: WorkoutLogOperation['stage'],
  ): Promise<WorkoutLogOperation | null> {
    return serializeStorageOperation(async () => {
      const operations = await read();
      const current = operations.find((operation) => operation.operationId === operationId);
      if (!current || current.stage.kind !== expectedStage) return current ?? null;

      const advanced = workoutLogOperationSchema.parse({ ...current, stage });
      const next = operations.map((candidate) =>
        candidate.operationId === operationId ? advanced : candidate,
      );
      await write(next);
      return advanced;
    });
  }

  return {
    ensure(operation) {
      return serializeStorageOperation(async () => {
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
      return readOperation(operationId);
    },

    hasForDay(ownerAuthUserId, date, workoutDayId) {
      return serializeStorageOperation(async () => {
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
      let requester: ApiRequester;
      try {
        requester = bindRequester();
      } catch {
        return Promise.resolve();
      }

      return serializeDrain(async () => {
        const candidates = await serializeStorageOperation(() => read());

        for (const candidate of candidates) {
          if (
            candidate.ownerAuthUserId !== ownerAuthUserId ||
            candidate.stage.kind === 'terminal'
          ) {
            continue;
          }

          try {
            let current = await readOperation(candidate.operationId);
            if (
              !current ||
              current.ownerAuthUserId !== ownerAuthUserId ||
              current.stage.kind === 'terminal'
            ) {
              continue;
            }

            if (current.stage.kind === 'create') {
              const started = await requester.request<{ id: string }>('/workout-logs', {
                method: 'POST',
                body: JSON.stringify({ workoutDayId: current.workoutDayId, date: current.date }),
              });
              current = await persistStage(current.operationId, 'create', {
                kind: 'finish',
                workoutLogId: started.id,
              });
              if (!current) continue;
            }

            if (current.stage.kind === 'finish') {
              try {
                await requester.request(`/workout-logs/${current.stage.workoutLogId}/finish`, {
                  method: 'PATCH',
                  body: JSON.stringify(current.finish),
                });
              } catch (error) {
                if (!isAlreadyCompletedConflict(error)) throw error;
              }
              await persistStage(current.operationId, 'finish', { kind: 'terminal' });
            }
          } catch {
            // A etapa já persistida permanece disponível para o próximo drain.
          }
        }
      });
    },

    removeTerminal(ownerAuthUserId, date, workoutDayId) {
      return serializeStorageOperation(async () => {
        const operations = await read();
        const retained = operations.filter(
          (operation) =>
            operation.ownerAuthUserId !== ownerAuthUserId ||
            operation.date !== date ||
            operation.workoutDayId !== workoutDayId ||
            operation.stage.kind !== 'terminal',
        );
        if (retained.length === operations.length) return;
        await write(retained);
      });
    },
  };
}
