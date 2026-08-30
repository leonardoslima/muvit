import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiRequester, ApiTransportError } from './api';
import { type QueueStorage, type WorkoutLogOperation, createWorkoutLogJournal } from './log-queue';

const WORKOUT_DAY_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_WORKOUT_DAY_ID = '22222222-2222-4222-8222-222222222222';
const WORKOUT_EXERCISE_ID = '33333333-3333-4333-8333-333333333333';

function memoryStorage(seed: Record<string, string | null> = {}, onSet?: (value: string) => void) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      onSet?.(value);
      values.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
  } satisfies QueueStorage;
}

function workoutLogOperation({
  operationId = 'operation-a',
  ownerAuthUserId = 'user-a',
  workoutDayId = WORKOUT_DAY_ID,
  date = '2026-08-27',
  stage = { kind: 'create' },
}: Partial<WorkoutLogOperation> = {}): WorkoutLogOperation {
  return {
    version: 1,
    operationId,
    ownerAuthUserId,
    workoutDayId,
    date,
    finish: {
      durationMin: 45,
      completed: true,
      sets: [
        {
          workoutExerciseId: WORKOUT_EXERCISE_ID,
          setNumber: 1,
          repsDone: 10,
          completed: true,
        },
      ],
    },
    stage,
  };
}

function persistedStage(serialized: string): string {
  const operations = JSON.parse(serialized) as WorkoutLogOperation[];
  return operations[0]?.stage.kind ?? 'empty';
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolvePromise = (_value: T): void => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

describe('createWorkoutLogJournal', () => {
  it('persiste create antes do POST e finish antes do PATCH', async () => {
    const events: string[] = [];
    const storage = memoryStorage({}, (value) => events.push(`persist:${persistedStage(value)}`));
    const journal = createWorkoutLogJournal(storage);
    const request = vi.fn();
    const requester: ApiRequester = {
      async request<T>(path: string): Promise<T> {
        request(path);
        events.push(`request:${path}`);
        return (path === '/workout-logs' ? { id: 'log-a' } : null) as T;
      },
    };

    await journal.ensure(workoutLogOperation());
    await journal.drain('user-a', () => requester);

    expect(storage.setItem.mock.calls.map(([, value]) => persistedStage(value))).toEqual([
      'create',
      'finish',
      'terminal',
    ]);
    expect(events).toEqual([
      'persist:create',
      'request:/workout-logs',
      'persist:finish',
      'request:/workout-logs/log-a/finish',
      'persist:terminal',
    ]);
  });

  it('retoma finish executando somente PATCH e nunca processa operação de outro usuário', async () => {
    const operation = workoutLogOperation({
      stage: { kind: 'finish', workoutLogId: 'log-a' },
    });
    const storage = memoryStorage({
      muvit_workout_log_journal: JSON.stringify([operation]),
    });
    const journal = createWorkoutLogJournal(storage);
    const requester = { request: vi.fn().mockResolvedValue(null) };

    await journal.drain('user-b', () => requester);
    expect(requester.request).not.toHaveBeenCalled();

    await journal.drain('user-a', () => requester);

    expect(requester.request).toHaveBeenCalledTimes(1);
    expect(requester.request).toHaveBeenCalledWith('/workout-logs/log-a/finish', {
      method: 'PATCH',
      body: JSON.stringify(operation.finish),
    });
    await expect(journal.get(operation.operationId)).resolves.toMatchObject({
      stage: { kind: 'terminal' },
    });
  });

  it('marca terminal quando o replay confirma que o log já foi concluído', async () => {
    const operation = workoutLogOperation({
      stage: { kind: 'finish', workoutLogId: 'log-a' },
    });
    const storage = memoryStorage({
      muvit_workout_log_journal: JSON.stringify([operation]),
    });
    const journal = createWorkoutLogJournal(storage);
    const requester = {
      request: vi
        .fn()
        .mockRejectedValueOnce(new ApiTransportError(new TypeError('resposta perdida')))
        .mockRejectedValueOnce(new ApiError('log already completed', 409)),
    };

    await journal.drain('user-a', () => requester);
    await expect(journal.get(operation.operationId)).resolves.toMatchObject({
      stage: { kind: 'finish', workoutLogId: 'log-a' },
    });

    await journal.drain('user-a', () => requester);

    await expect(journal.get(operation.operationId)).resolves.toMatchObject({
      stage: { kind: 'terminal' },
    });
    expect(requester.request).toHaveBeenCalledTimes(2);
  });

  it('mantém finish quando o servidor responde com outro conflito 409', async () => {
    const operation = workoutLogOperation({
      stage: { kind: 'finish', workoutLogId: 'log-a' },
    });
    const storage = memoryStorage({
      muvit_workout_log_journal: JSON.stringify([operation]),
    });
    const journal = createWorkoutLogJournal(storage);
    const requester = {
      request: vi.fn().mockRejectedValue(new ApiError('conflito de versão', 409)),
    };

    await journal.drain('user-a', () => requester);

    await expect(journal.get(operation.operationId)).resolves.toMatchObject({
      stage: { kind: 'finish', workoutLogId: 'log-a' },
    });
  });

  it('captura um único requester e o reutiliza em todas as operações do drain', async () => {
    const first = workoutLogOperation({
      stage: { kind: 'finish', workoutLogId: 'log-a' },
    });
    const second = workoutLogOperation({
      operationId: 'operation-b',
      workoutDayId: OTHER_WORKOUT_DAY_ID,
      stage: { kind: 'finish', workoutLogId: 'log-b' },
    });
    const storage = memoryStorage({
      muvit_workout_log_journal: JSON.stringify([first, second]),
    });
    const journal = createWorkoutLogJournal(storage);
    const requester = { request: vi.fn().mockResolvedValue(null) };
    const bindRequester = vi.fn(() => requester);

    await journal.drain('user-a', bindRequester);

    expect(bindRequester).toHaveBeenCalledTimes(1);
    expect(requester.request).toHaveBeenCalledTimes(2);
    expect(requester.request).toHaveBeenNthCalledWith(1, '/workout-logs/log-a/finish', {
      method: 'PATCH',
      body: JSON.stringify(first.finish),
    });
    expect(requester.request).toHaveBeenNthCalledWith(2, '/workout-logs/log-b/finish', {
      method: 'PATCH',
      body: JSON.stringify(second.finish),
    });
  });

  it('mantém tombstone somente para o mesmo owner, data e dia', async () => {
    const journal = createWorkoutLogJournal(memoryStorage());
    await journal.ensure(workoutLogOperation({ stage: { kind: 'terminal' } }));

    await expect(journal.hasForDay('user-a', '2026-08-27', WORKOUT_DAY_ID)).resolves.toBe(true);
    await expect(journal.hasForDay('user-b', '2026-08-27', WORKOUT_DAY_ID)).resolves.toBe(false);
    await expect(journal.hasForDay('user-a', '2026-08-28', WORKOUT_DAY_ID)).resolves.toBe(false);
    await expect(journal.hasForDay('user-a', '2026-08-27', OTHER_WORKOUT_DAY_ID)).resolves.toBe(
      false,
    );
  });

  it('serializa ensures concorrentes sem perder operações', async () => {
    const journal = createWorkoutLogJournal(memoryStorage());
    const first = workoutLogOperation();
    const second = workoutLogOperation({
      operationId: 'operation-b',
      workoutDayId: OTHER_WORKOUT_DAY_ID,
    });

    await Promise.all([journal.ensure(first), journal.ensure(second)]);

    await expect(journal.get(first.operationId)).resolves.toEqual(first);
    await expect(journal.get(second.operationId)).resolves.toEqual(second);
  });

  it('serializa ensures concorrentes entre instâncias sem perder operações', async () => {
    const storage = memoryStorage();
    const firstJournal = createWorkoutLogJournal(storage);
    const secondJournal = createWorkoutLogJournal(storage);
    const first = workoutLogOperation();
    const second = workoutLogOperation({
      operationId: 'operation-b',
      workoutDayId: OTHER_WORKOUT_DAY_ID,
    });

    await Promise.all([firstJournal.ensure(first), secondJournal.ensure(second)]);

    const verifier = createWorkoutLogJournal(storage);
    await expect(verifier.get(first.operationId)).resolves.toEqual(first);
    await expect(verifier.get(second.operationId)).resolves.toEqual(second);
  });

  it('serializa ensure e removeTerminal entre instâncias sem apagar operação recém-persistida', async () => {
    const oldTerminal = workoutLogOperation({
      operationId: 'operation-old',
      date: '2026-08-26',
      stage: { kind: 'terminal' },
    });
    const current = workoutLogOperation();
    const storage = memoryStorage({
      muvit_workout_log_journal: JSON.stringify([oldTerminal]),
    });
    const ensureJournal = createWorkoutLogJournal(storage);
    const removeTerminalJournal = createWorkoutLogJournal(storage);

    await Promise.all([
      ensureJournal.ensure(current),
      removeTerminalJournal.removeTerminal(
        oldTerminal.ownerAuthUserId,
        oldTerminal.date,
        oldTerminal.workoutDayId,
      ),
    ]);

    const verifier = createWorkoutLogJournal(storage);
    await expect(verifier.get(oldTerminal.operationId)).resolves.toBeNull();
    await expect(verifier.get(current.operationId)).resolves.toEqual(current);
  });

  it('mantém a operação existente quando ensure repete o operationId', async () => {
    const existing = workoutLogOperation({ stage: { kind: 'terminal' } });
    const storage = memoryStorage({
      muvit_workout_log_journal: JSON.stringify([existing]),
    });
    const journal = createWorkoutLogJournal(storage);

    await expect(journal.ensure(workoutLogOperation())).resolves.toEqual(existing);

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('serializa ensure e drain concorrentes sem perder avanço de etapa', async () => {
    const first = workoutLogOperation();
    const storage = memoryStorage({
      muvit_workout_log_journal: JSON.stringify([first]),
    });
    const journal = createWorkoutLogJournal(storage);
    const second = workoutLogOperation({
      operationId: 'operation-b',
      workoutDayId: OTHER_WORKOUT_DAY_ID,
    });
    const request = vi.fn();
    const requester: ApiRequester = {
      async request<T>(path: string, init?: RequestInit): Promise<T> {
        request(path, init);
        if (path !== '/workout-logs') return null as T;
        const body = JSON.parse(String(init?.body)) as { workoutDayId: string };
        return { id: `log-${body.workoutDayId}` } as T;
      },
    };

    await Promise.all([journal.ensure(second), journal.drain('user-a', () => requester)]);

    await expect(journal.get(first.operationId)).resolves.toMatchObject({
      stage: { kind: 'terminal' },
    });
    await expect(journal.get(second.operationId)).resolves.toMatchObject({
      stage: { kind: 'terminal' },
    });
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('não bloqueia leitura local durante rede e mantém drain single-flight entre instâncias', async () => {
    const operation = workoutLogOperation();
    const storage = memoryStorage({
      muvit_workout_log_journal: JSON.stringify([operation]),
    });
    const firstJournal = createWorkoutLogJournal(storage);
    const secondJournal = createWorkoutLogJournal(storage);
    const requestStarted = deferred<void>();
    const releasePost = deferred<{ id: string }>();
    const request = vi.fn();
    const requester: ApiRequester = {
      async request<T>(path: string): Promise<T> {
        request(path);
        if (path === '/workout-logs') {
          requestStarted.resolve();
          return (await releasePost.promise) as T;
        }
        return null as T;
      },
    };

    const firstDrain = firstJournal.drain('user-a', () => requester);
    await requestStarted.promise;
    const secondDrain = secondJournal.drain('user-a', () => requester);
    let readDuringNetwork: WorkoutLogOperation | null | undefined;
    const read = secondJournal.get(operation.operationId).then((value) => {
      readDuringNetwork = value;
      return value;
    });

    try {
      await vi.waitFor(
        () => {
          expect(readDuringNetwork).toEqual(operation);
        },
        { interval: 5, timeout: 100 },
      );
    } finally {
      releasePost.resolve({ id: 'log-a' });
      await Promise.all([firstDrain, secondDrain, read]);
    }

    expect(request.mock.calls.filter(([path]) => path === '/workout-logs')).toHaveLength(1);
    expect(
      request.mock.calls.filter(([path]) => path === '/workout-logs/log-a/finish'),
    ).toHaveLength(1);
    await expect(firstJournal.get(operation.operationId)).resolves.toMatchObject({
      stage: { kind: 'terminal' },
    });
  });

  it('rejeita conteúdo persistido inválido sem sobrescrevê-lo', async () => {
    const storage = memoryStorage({ muvit_workout_log_journal: '{inválido' });
    const journal = createWorkoutLogJournal(storage);

    await expect(journal.ensure(workoutLogOperation())).rejects.toThrow();

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('rejeita campo desconhecido em finish sem regravar o journal', async () => {
    const operation = workoutLogOperation();
    const invalidOperation = {
      ...operation,
      finish: { ...operation.finish, campoDesconhecido: true },
    };
    const storage = memoryStorage({
      muvit_workout_log_journal: JSON.stringify([invalidOperation]),
    });
    const journal = createWorkoutLogJournal(storage);

    await expect(journal.get(operation.operationId)).rejects.toThrow(
      'Journal de conclusão inválido.',
    );

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('rejeita campo desconhecido em set sem regravar o journal', async () => {
    const operation = workoutLogOperation();
    const invalidOperation = {
      ...operation,
      finish: {
        ...operation.finish,
        sets: operation.finish.sets.map((set, index) =>
          index === 0 ? { ...set, campoDesconhecido: true } : set,
        ),
      },
    };
    const storage = memoryStorage({
      muvit_workout_log_journal: JSON.stringify([invalidOperation]),
    });
    const journal = createWorkoutLogJournal(storage);

    await expect(journal.get(operation.operationId)).rejects.toThrow(
      'Journal de conclusão inválido.',
    );

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('remove somente o tombstone reconciliado sem apagar outro dia pendente', async () => {
    const reconciled = workoutLogOperation({ date: '2026-08-26', stage: { kind: 'terminal' } });
    const sibling = workoutLogOperation({
      operationId: 'operation-sibling',
      workoutDayId: OTHER_WORKOUT_DAY_ID,
      date: '2026-08-26',
      stage: { kind: 'terminal' },
    });
    const storage = memoryStorage({
      muvit_workout_log_journal: JSON.stringify([reconciled, sibling]),
    });
    const journal = createWorkoutLogJournal(storage);

    await journal.removeTerminal(
      reconciled.ownerAuthUserId,
      reconciled.date,
      reconciled.workoutDayId,
    );

    await expect(journal.get(reconciled.operationId)).resolves.toBeNull();
    await expect(journal.get(sibling.operationId)).resolves.toEqual(sibling);
  });
});
