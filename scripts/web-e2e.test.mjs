import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { assertOwnedContainer, assertPortFree, parseArgs, runStages } from './web-e2e.mjs';

test('valida argumentos antes de criar recursos', () => {
  assert.deepEqual(parseArgs([]), {
    ports: { web: 3013, api: 3353, db: 5453 },
    artifactScope: 'web-e2e',
    headed: false,
    scenario: 'all',
  });
  for (const args of [
    ['--wat'],
    ['--web-port', '0'],
    ['--db-port', '3013'],
    ['--artifact-scope', '../x'],
    ['--scenario', 'bad'],
  ])
    assert.throws(() => parseArgs(args));
});

test('rejeita porta ocupada', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await assert.rejects(assertPortFree(server.address().port), /ocupada/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('recusa remover container estrangeiro', () => {
  assert.throws(() =>
    assertOwnedContainer({ name: 'muvit_web_e2e_abc_test', owner: 'outro', runId: 'abc' }, 'abc'),
  );
});

test('limpa recursos em cada falha e preserva código', async () => {
  for (const failed of ['database', 'migration', 'api', 'web', 'playwright']) {
    const cleanups = [];
    const stages = Object.fromEntries(
      ['database', 'migration', 'api', 'web', 'playwright'].map((stage) => [
        stage,
        async (resources) => {
          resources.registerCleanup(stage, async () => cleanups.push(stage));
          if (stage === failed) {
            const error = new Error(stage);
            error.exitCode = 23;
            throw error;
          }
        },
      ]),
    );
    await assert.rejects(runStages(stages), (error) => error.exitCode === 23);
    assert.equal(cleanups[0], failed);
    assert.equal(cleanups.at(-1), 'database');
  }
});

test('falha de limpeza impede sucesso', async () => {
  const noop = async () => {};
  await assert.rejects(
    runStages({
      database: async (resources) =>
        resources.registerCleanup('db', async () => {
          throw new Error('falhou');
        }),
      migration: noop,
      api: noop,
      web: noop,
      playwright: noop,
    }),
    /limpar/,
  );
});

test('localiza executável pnpm absoluto no Windows', async () => {
  const { resolvePnpm } = await import('./web-e2e.mjs');
  const executable = await resolvePnpm();
  if (process.platform === 'win32') assert.match(executable, /^[A-Za-z]:\\.*pnpm\.cmd$/i);
});

test('interrupção impede etapas seguintes e limpa recursos próprios', async () => {
  const controller = new AbortController();
  const calls = [];
  const noop = async () => {
    calls.push('inesperado');
  };
  await assert.rejects(
    runStages(
      {
        database: async (resources) => {
          resources.registerCleanup('db', async () => calls.push('cleanup'));
          controller.abort(new Error('interrompido'));
        },
        migration: noop,
        api: noop,
        web: noop,
        playwright: noop,
      },
      controller.signal,
    ),
    /interrompido/,
  );
  assert.deepEqual(calls, ['cleanup']);
});

test('sinal durante limpeza impede sucesso após finalizar os recursos', async () => {
  const controller = new AbortController();
  const interrupted = new Error('SIGTERM');
  interrupted.exitCode = 143;
  const cleaned = [];
  const noop = async () => {};
  await assert.rejects(
    runStages(
      {
        database: async (resources) => {
          resources.registerCleanup('primeiro', async () => cleaned.push('primeiro'));
          resources.registerCleanup('segundo', async () => {
            controller.abort(interrupted);
            cleaned.push('segundo');
          });
        },
        migration: noop,
        api: noop,
        web: noop,
        playwright: noop,
      },
      controller.signal,
    ),
    (error) => error === interrupted && error.exitCode === 143,
  );
  assert.deepEqual(cleaned, ['segundo', 'primeiro']);
});

test('falha anterior permanece principal quando sinal chega durante limpeza', async () => {
  const controller = new AbortController();
  const primary = new Error('falha anterior');
  primary.exitCode = 23;
  const noop = async () => {};
  await assert.rejects(
    runStages(
      {
        database: async (resources) => {
          resources.registerCleanup('db', async () => controller.abort(new Error('SIGTERM')));
          throw primary;
        },
        migration: noop,
        api: noop,
        web: noop,
        playwright: noop,
      },
      controller.signal,
    ),
    (error) => error === primary && error.exitCode === 23,
  );
});

test(
  'Unix encerra descendente mesmo quando líder termina antes dele',
  { skip: process.platform === 'win32' },
  async () => {
    const { runAbortableCommand } = await import('./web-e2e.mjs');
    const controller = new AbortController();
    let descendantPid = 0;
    let cleanupError;
    const childCode =
      'process.on("SIGTERM", () => {}); process.stdout.write("ready"); setInterval(() => {}, 1000)';
    const parentCode = `const { spawn } = require('node:child_process'); const child = spawn(process.execPath, ['-e', ${JSON.stringify(childCode)}]); child.stdout.once('data', () => process.stdout.write(String(child.pid))); setInterval(() => {}, 1000);`;
    try {
      await assert.rejects(
        runAbortableCommand(process.execPath, ['-e', parentCode], {
          signal: controller.signal,
          timeoutMs: 10000,
          onOutput: (stdout) => {
            descendantPid = Number(stdout);
            controller.abort(new Error('cancelado'));
          },
        }),
        /cancelado/,
      );
      assert.ok(descendantPid > 0);
      const end = Date.now() + 3000;
      let alive = true;
      while (alive && Date.now() < end) {
        try {
          process.kill(descendantPid, 0);
          await new Promise((done) => setTimeout(done, 50));
        } catch (error) {
          if (error.code !== 'ESRCH') throw error;
          alive = false;
        }
      }
      assert.equal(alive, false, 'descendente permaneceu ativo');
      descendantPid = 0;
    } finally {
      if (descendantPid) {
        try {
          process.kill(descendantPid, 'SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') cleanupError = error;
        }
      }
    }
    if (cleanupError) throw cleanupError;
  },
);

test('limpeza exige evidência de ausência e não ignora falha do daemon', async () => {
  const { cleanupOwnedContainer } = await import('./web-e2e.mjs');
  const calls = [];
  await assert.rejects(
    cleanupOwnedContainer('abc', async (_binary, args) => {
      calls.push(args);
      return { code: 1, stdout: '', stderr: 'daemon indisponível' };
    }),
    /Docker/,
  );
  assert.equal(calls.length, 1);
  const absent = [];
  await cleanupOwnedContainer('abc', async (_binary, args) => {
    absent.push(args);
    return { code: 0, stdout: '', stderr: '' };
  });
  assert.equal(absent.length, 1);
});

test('limpeza recusa container com labels estrangeiras', async () => {
  const { cleanupOwnedContainer } = await import('./web-e2e.mjs');
  const calls = [];
  await assert.rejects(
    cleanupOwnedContainer('abc', async (_binary, args) => {
      calls.push(args);
      return args[0] === 'ps'
        ? { code: 0, stdout: 'id', stderr: '' }
        : { code: 0, stdout: '/muvit_web_e2e_abc_test|estranho|abc', stderr: '' };
    }),
    /não pertence/,
  );
  assert.equal(calls.length, 2);
});

test('interrompe comando Docker pendente e executa cleanup registrado', async () => {
  const { runAbortableCommand } = await import('./web-e2e.mjs');
  const controller = new AbortController();
  const interrupted = new Error('SIGTERM');
  interrupted.exitCode = 143;
  const cleaned = [];
  let subprocessPid;
  const noop = async () => {};
  const started = Date.now();
  await assert.rejects(
    runStages(
      {
        database: async (resources) => {
          resources.registerCleanup('container', async () => cleaned.push('container'));
          await runAbortableCommand(
            process.execPath,
            ['-e', 'process.stdout.write(String(process.pid)); setInterval(() => {}, 1000)'],
            {
              signal: controller.signal,
              timeoutMs: 10000,
              onOutput: (stdout) => {
                subprocessPid = Number(stdout);
                controller.abort(interrupted);
              },
            },
          );
        },
        migration: noop,
        api: noop,
        web: noop,
        playwright: noop,
      },
      controller.signal,
    ),
    (error) => error === interrupted && error.exitCode === 143,
  );
  assert.deepEqual(cleaned, ['container']);
  assert.ok(Date.now() - started < 8000);
  assert.ok(subprocessPid > 0);
  assert.throws(() => process.kill(subprocessPid, 0));
});

test('timeout encerra subprocesso pendente e não retorna sucesso', async () => {
  const { runAbortableCommand } = await import('./web-e2e.mjs');
  await assert.rejects(
    runAbortableCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      timeoutMs: 300,
    }),
    /Tempo limite/,
  );
});

test('registra falha de limpeza simultânea sem substituir erro e código originais', async () => {
  const primary = new Error('falha principal');
  primary.exitCode = 23;
  const cleanupFailures = [];
  const noop = async () => {};
  await assert.rejects(
    runStages(
      {
        database: async (resources) => {
          resources.registerCleanup('container', async () => {
            throw new Error('daemon indisponível');
          });
          throw primary;
        },
        migration: noop,
        api: noop,
        web: noop,
        playwright: noop,
      },
      undefined,
      (name, error) => cleanupFailures.push({ name, message: error.message }),
    ),
    (error) => error === primary && error.exitCode === 23,
  );
  assert.deepEqual(cleanupFailures, [{ name: 'container', message: 'daemon indisponível' }]);
});
