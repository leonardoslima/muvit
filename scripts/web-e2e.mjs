import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand, runWithResources, sanitizeRecursively } from './mobile-e2e.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function resolvePnpm() {
  if (process.platform !== 'win32') return 'pnpm';
  const result = await runCommand('where.exe', ['pnpm.cmd']);
  if (result.code !== 0 || !result.stdout.trim()) throw new Error('pnpm.cmd não encontrado');
  return result.stdout.trim().split(/\r?\n/)[0];
}
const owner = 'muvit-web-e2e';

export function parseArgs(argv) {
  const result = {
    ports: { web: 3013, api: 3353, db: 5453 },
    artifactScope: 'web-e2e',
    headed: false,
    scenario: 'all',
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') return { help: true };
    if (arg === '--headed') {
      result.headed = true;
      continue;
    }
    if (
      !['--web-port', '--api-port', '--db-port', '--artifact-scope', '--scenario'].includes(arg) ||
      !argv[i + 1] ||
      argv[i + 1].startsWith('--')
    )
      throw new Error(`Opção inválida: ${arg}`);
    const value = argv[++i];
    if (arg.endsWith('-port')) {
      const port = Number(value);
      if (!/^\d+$/.test(value) || !Number.isInteger(port) || port < 1024 || port > 65535)
        throw new Error(`Porta inválida: ${value}`);
      result.ports[arg.slice(2, -5)] = port;
    } else if (arg === '--scenario') {
      if (!['all', 'jornada', 'isolamento'].includes(value)) throw new Error('Cenário inválido');
      result.scenario = value;
    } else {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw new Error('artifact-scope inválido');
      result.artifactScope = value;
    }
  }
  if (new Set(Object.values(result.ports)).size !== 3)
    throw new Error('Portas devem ser distintas');
  return result;
}

export async function assertPortFree(port) {
  await new Promise((done, fail) => {
    const server = createServer();
    server.once('error', () => fail(new Error(`Porta ${port} ocupada ou indisponível`)));
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () =>
      server.close((error) => (error ? fail(error) : done())),
    );
  });
}

export function assertOwnedContainer(container, runId) {
  if (
    container.name !== `muvit_web_e2e_${runId}_test` ||
    container.owner !== owner ||
    container.runId !== runId
  )
    throw new Error('Container não pertence a esta execução');
}

export async function runStages(stages, signal, onCleanupFailure) {
  const result = await runWithResources(async (resources) => {
    const trackedResources = {
      registerCleanup(name, cleanup) {
        resources.registerCleanup(name, async () => {
          try {
            await cleanup();
          } catch (error) {
            onCleanupFailure?.(name, error);
            throw error;
          }
        });
      },
    };
    for (const name of ['database', 'migration', 'api', 'web', 'playwright']) {
      signal?.throwIfAborted();
      await stages[name](trackedResources);
      signal?.throwIfAborted();
    }
  });
  signal?.throwIfAborted();
  return result;
}

function env(values = {}) {
  const allowed = new Set([
    'path',
    'systemroot',
    'windir',
    'temp',
    'tmp',
    'userprofile',
    'localappdata',
    'appdata',
    'home',
    'comspec',
    'pathext',
    'docker_host',
    'docker_context',
  ]);
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) => allowed.has(key.toLowerCase())),
    ),
    ...values,
  };
}
function success(result, label) {
  if (result.code !== 0) {
    const error = new Error(`${label} terminou com código ${result.code}`);
    error.exitCode = result.code;
    throw error;
  }
  return result;
}
async function docker(args, signal, onStopFailure) {
  return success(
    await runAbortableCommand('docker', args, {
      env: env(),
      signal,
      timeoutMs: 30000,
      onStopFailure,
    }),
    'Docker',
  );
}
export async function cleanupOwnedContainer(runId, invoke = runAbortableCommand) {
  if (!/^[a-f0-9]+$/.test(runId)) throw new Error('runId inválido');
  const name = `muvit_web_e2e_${runId}_test`;
  const options = { env: env(), timeoutMs: 30000 };
  const listed = success(
    await invoke('docker', ['ps', '-aq', '--no-trunc', '--filter', `name=^/${name}$`], options),
    'Docker',
  );
  if (!listed.stdout.trim()) return;
  const inspected = success(
    await invoke(
      'docker',
      [
        'inspect',
        '--format',
        '{{.Name}}|{{index .Config.Labels "muvit.owner"}}|{{index .Config.Labels "muvit.run"}}',
        name,
      ],
      options,
    ),
    'Docker',
  );
  const [actualName, actualOwner, actualRun] = inspected.stdout
    .trim()
    .replace(/^\//, '')
    .split('|');
  assertOwnedContainer({ name: actualName, owner: actualOwner, runId: actualRun }, runId);
  success(await invoke('docker', ['rm', '--force', '--volumes', name], options), 'Docker');
}
function startChild(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    detached: process.platform !== 'win32',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  for (const [stream, isStdout] of [
    [child.stdout, true],
    [child.stderr, false],
  ]) {
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      if (isStdout) stdout += chunk;
      else stderr += chunk;
      options.onOutput?.(stdout, stderr);
    });
  }
  child.output = () => `${stdout}\n${stderr}`;
  child.result = () => ({ stdout, stderr });
  child.once('error', (error) => {
    child.spawnFailure = error;
  });
  return child;
}
async function stopChild(child) {
  if (!child.pid || child.spawnFailure) return;
  if (process.platform === 'win32') {
    if (child.exitCode !== null) return;
    const result = await runCommand('taskkill.exe', ['/PID', String(child.pid), '/T', '/F']);
    if (result.code !== 0 && child.exitCode === null)
      throw new Error('Falha ao encerrar processo próprio');
  } else {
    const signalGroup = (signal) => {
      try {
        process.kill(-child.pid, signal);
        return true;
      } catch (error) {
        if (error.code === 'ESRCH') return false;
        throw error;
      }
    };
    if (!signalGroup('SIGTERM')) return;
    const deadline = Date.now() + 1000;
    while (Date.now() < deadline) {
      await new Promise((done) => setTimeout(done, 50));
      if (!signalGroup(0)) return;
    }
    signalGroup('SIGKILL');
  }
}
export async function runAbortableCommand(binary, args, options = {}) {
  options.signal?.throwIfAborted();
  const batch = process.platform === 'win32' && /\.(cmd|bat)$/i.test(binary);
  const quote = (value) => {
    if (/["\r\n%]/.test(value)) throw new Error('Argumento batch inválido');
    return `"${value}"`;
  };
  const commandName = batch ? (process.env.ComSpec ?? 'cmd.exe') : binary;
  const commandArgs = batch
    ? ['/d', '/s', '/c', `"${[binary, ...args].map(quote).join(' ')}"`]
    : args;
  const child = startChild(commandName, commandArgs, {
    cwd: options.cwd,
    env: options.env,
    onOutput: options.onOutput,
    windowsVerbatimArguments: batch,
  });
  let cancellation;
  let stop;
  let resolveCancelled;
  const cancelled = new Promise((done) => {
    resolveCancelled = done;
  });
  const cancel = (reason) => {
    if (cancellation) return;
    cancellation = reason;
    let stopTimer;
    const deadline = new Promise((_, fail) => {
      stopTimer = setTimeout(() => fail(new Error('Tempo limite ao encerrar subprocesso')), 5000);
    });
    stop = Promise.race([stopChild(child), deadline])
      .catch((error) => options.onStopFailure?.(error))
      .finally(() => {
        clearTimeout(stopTimer);
        resolveCancelled();
      });
  };
  const onAbort = () => cancel(options.signal.reason);
  options.signal?.addEventListener('abort', onAbort, { once: true });
  if (options.signal?.aborted) onAbort();
  const timer = setTimeout(
    () => cancel(new Error('Tempo limite do subprocesso')),
    options.timeoutMs ?? 120000,
  );
  try {
    const completion = new Promise((done, fail) => {
      child.once('error', fail);
      child.once('close', (value) => done(value ?? 1));
    });
    const code = await Promise.race([completion, cancelled]);
    if (stop) await stop;
    if (cancellation) throw cancellation;
    return { code, ...child.result() };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}
async function waitHttp(url, child, signal) {
  const end = Date.now() + 120000;
  while (Date.now() < end) {
    signal.throwIfAborted();
    if (child.spawnFailure) throw child.spawnFailure;
    if (child.exitCode !== null)
      throw new Error(
        `Serviço encerrou antes de ficar pronto (${url}); consulte o log, incluindo possível lock do Next`,
      );
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {}
    await new Promise((done) => setTimeout(done, 300));
  }
  throw new Error(`Tempo limite aguardando ${url}`);
}

export async function run(options) {
  const pnpm = await resolvePnpm();
  const runId = randomBytes(6).toString('hex');
  const artifactDir = join(
    root,
    'artifacts',
    options.artifactScope,
    `${new Date().toISOString().replace(/[:.]/g, '')}-${runId}`,
  );
  const name = `muvit_web_e2e_${runId}_test`;
  const user = `e2e_${runId}`;
  const password = randomBytes(24).toString('hex');
  const secret = randomBytes(32).toString('base64url');
  const databaseUrl = `postgresql://${user}:${password}@127.0.0.1:${options.ports.db}/muvit_web_e2e_test`;
  const webUrl = `http://127.0.0.1:${options.ports.web}`;
  const apiUrl = `http://127.0.0.1:${options.ports.api}`;
  const secrets = [password, secret, databaseUrl];
  const report = {
    runId,
    artifactDir,
    ports: options.ports,
    scenario: options.scenario,
    status: 'failed',
    cleanupErrors: [],
    cleanupWarnings: [],
  };
  await mkdir(artifactDir, { recursive: true });
  const controller = new AbortController();
  const recordCleanupFailure = (resource, error) => {
    report.cleanupErrors.push({
      resource,
      error: sanitizeRecursively(
        error instanceof Error ? error.message : 'Erro desconhecido',
        secrets,
      ),
    });
  };
  const dockerStopFailure = (error) => recordCleanupFailure('docker-process', error);
  const onSignal = (signal, exitCode) => {
    const error = new Error(`Execução interrompida: ${signal}`);
    error.exitCode = exitCode;
    controller.abort(error);
  };
  const onInterrupt = () => onSignal('SIGINT', 130);
  const onTerminate = () => onSignal('SIGTERM', 143);
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);
  const command = async (label, binary, args, opts) => {
    const result = await runAbortableCommand(binary, args, {
      ...opts,
      signal: controller.signal,
      timeoutMs: 180000,
      onStopFailure: (error) => recordCleanupFailure(`${label}-process`, error),
    });
    await writeFile(
      join(artifactDir, `${label}.log`),
      sanitizeRecursively(`${result.stdout}\n${result.stderr}`, secrets),
      'utf8',
    );
    controller.signal.throwIfAborted();
    return success(result, label);
  };
  try {
    for (const port of Object.values(options.ports)) await assertPortFree(port);
    await runStages(
      {
        database: async (resources) => {
          await docker(
            ['version', '--format', '{{.Server.Version}}'],
            controller.signal,
            dockerStopFailure,
          );
          resources.registerCleanup('postgres-container', () =>
            cleanupOwnedContainer(runId, (binary, args, options) =>
              runAbortableCommand(binary, args, { ...options, onStopFailure: dockerStopFailure }),
            ),
          );
          try {
            await docker(
              [
                'run',
                '--detach',
                '--name',
                name,
                '--label',
                `muvit.owner=${owner}`,
                '--label',
                `muvit.run=${runId}`,
                '--env',
                `POSTGRES_USER=${user}`,
                '--env',
                `POSTGRES_PASSWORD=${password}`,
                '--env',
                'POSTGRES_DB=muvit_web_e2e_test',
                '--publish',
                `127.0.0.1:${options.ports.db}:5432`,
                'postgres:16-alpine',
              ],
              controller.signal,
              dockerStopFailure,
            );
          } catch (error) {
            report.cleanupWarnings.push(
              'A criação do container pode continuar no daemon após interrupção ou timeout; confira o runId.',
            );
            throw error;
          }
          const end = Date.now() + 45000;
          while (Date.now() < end) {
            controller.signal.throwIfAborted();
            if (
              (
                await runAbortableCommand(
                  'docker',
                  ['exec', name, 'pg_isready', '-U', user, '-d', 'muvit_web_e2e_test'],
                  {
                    env: env(),
                    signal: controller.signal,
                    timeoutMs: 10000,
                    onStopFailure: dockerStopFailure,
                  },
                )
              ).code === 0
            )
              return;
            await new Promise((done) => setTimeout(done, 500));
          }
          throw new Error('Tempo limite aguardando PostgreSQL');
        },
        migration: async () => {
          await command('migration', process.execPath, ['--import', 'tsx', 'src/migrate.ts'], {
            cwd: join(root, 'packages/db'),
            env: env({ NODE_ENV: 'test', DATABASE_URL: databaseUrl }),
          });
          await command('build-runtime', pnpm, ['--filter', '@muvit/api', 'run', 'build:runtime'], {
            cwd: root,
            env: env(),
          });
        },
        api: async (resources) => {
          const child = startChild(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
            cwd: join(root, 'apps/api'),
            env: env({
              NODE_ENV: 'test',
              API_HOST: '127.0.0.1',
              API_PORT: String(options.ports.api),
              DATABASE_URL: databaseUrl,
              BETTER_AUTH_SECRET: secret,
              BETTER_AUTH_URL: apiUrl,
              WEB_URL: webUrl,
              R2_ACCOUNT_ID: 'local-e2e',
              R2_ACCESS_KEY_ID: 'local-e2e',
              R2_SECRET_ACCESS_KEY: 'local-e2e',
              R2_BUCKET: 'local-e2e',
              R2_PUBLIC_URL: 'https://example.invalid/e2e',
              EMAIL_NOTIFICATIONS_ENABLED: 'false',
            }),
          });
          resources.registerCleanup('api-log', () =>
            writeFile(
              join(artifactDir, 'api.log'),
              sanitizeRecursively(child.output(), secrets),
              'utf8',
            ),
          );
          resources.registerCleanup('api', () => stopChild(child));
          await waitHttp(`${apiUrl}/health`, child, controller.signal);
        },
        web: async (resources) => {
          const child = startChild(
            process.execPath,
            [
              join(root, 'apps/web/node_modules/next/dist/bin/next'),
              'dev',
              '--hostname',
              '127.0.0.1',
              '--port',
              String(options.ports.web),
            ],
            {
              cwd: join(root, 'apps/web'),
              env: env({
                NODE_ENV: 'development',
                NEXT_PUBLIC_API_URL: apiUrl,
                NEXT_TELEMETRY_DISABLED: '1',
              }),
            },
          );
          resources.registerCleanup('web-log', () =>
            writeFile(
              join(artifactDir, 'web.log'),
              sanitizeRecursively(child.output(), secrets),
              'utf8',
            ),
          );
          resources.registerCleanup('web', () => stopChild(child));
          await waitHttp(`${webUrl}/login`, child, controller.signal);
        },
        playwright: async () => {
          await command(
            'playwright',
            pnpm,
            ['--dir', 'apps/web', 'run', 'test:e2e', ...(options.headed ? ['--headed'] : [])],
            {
              cwd: root,
              env: env({
                WEB_E2E_BASE_URL: webUrl,
                WEB_E2E_API_URL: apiUrl,
                WEB_E2E_RUN_ID: runId,
                WEB_E2E_ARTIFACT_DIR: artifactDir,
                WEB_E2E_SCENARIO: options.scenario,
              }),
            },
          );
        },
      },
      controller.signal,
      recordCleanupFailure,
    );
    controller.signal.throwIfAborted();
    report.status = 'passed';
    return report;
  } catch (error) {
    report.error = sanitizeRecursively(
      error instanceof Error ? error.message : 'Erro desconhecido',
      secrets,
    );
    throw error;
  } finally {
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onTerminate);
    await writeFile(
      join(artifactDir, 'report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help)
      process.stdout.write(
        'Uso: node scripts/web-e2e.mjs [--scenario all|jornada|isolamento] [--web-port porta] [--api-port porta] [--db-port porta] [--artifact-scope slug] [--headed]\n',
      );
    else process.stdout.write(`${JSON.stringify(await run(options), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Erro desconhecido'}\n`);
    process.exitCode = typeof error?.exitCode === 'number' ? error.exitCode : 1;
  }
}
