import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { hostname as currentHostname } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMailbox } from './e2e-mailbox.mjs';
import { runCommand, runWithResources, sanitizeRecursively } from './mobile-e2e.mjs';
import { startWindowsJob } from './web-e2e-windows-job.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function resolvePnpm() {
  if (process.platform !== 'win32') return 'pnpm';
  const result = await runCommand('where.exe', ['pnpm.cmd']);
  if (result.code !== 0 || !result.stdout.trim()) throw new Error('pnpm.cmd não encontrado');
  return result.stdout.trim().split(/\r?\n/)[0];
}
const owner = 'muvit-web-e2e';
const lockOwner = 'muvit-web-e2e';
const nextEnvDivergentWarning =
  'apps/web/next-env.d.ts não corresponde ao conteúdo gerado conhecido do Next; preservado sem restauração para não sobrescrever edição concorrente.';
const nextEnvRemovedWarning =
  'apps/web/next-env.d.ts foi removido durante o build; preservado sem recriação para não sobrescrever edição concorrente.';

export function parseArgs(argv) {
  const result = {
    ports: { web: 3013, api: 3353, db: 5453 },
    artifactScope: 'web-e2e',
    headed: false,
    webpack: false,
    production: false,
    scenario: 'all',
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') return { help: true };
    if (arg === '--headed') {
      result.headed = true;
      continue;
    }
    if (arg === '--webpack') {
      result.webpack = true;
      continue;
    }
    if (arg === '--production') {
      result.production = true;
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
      if (!['all', 'jornada', 'isolamento', 'confirmacao-email'].includes(value))
        throw new Error('Cenário inválido');
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

export function nextDevArgs(options) {
  return [
    join(root, 'apps/web/node_modules/next/dist/bin/next'),
    'dev',
    ...(options.webpack ? ['--webpack'] : []),
    '--hostname',
    '127.0.0.1',
    '--port',
    String(options.ports.web),
  ];
}

export function nextStartArgs(options) {
  return [
    join(root, 'apps/web/node_modules/next/dist/bin/next'),
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(options.ports.web),
  ];
}

export function productionDistDir(runId) {
  if (typeof runId !== 'string' || !/^[a-f0-9]+$/.test(runId)) throw new Error('runId inválido');
  return `.next-e2e-${runId}`;
}

export function distDirAbsolute(runId) {
  return join(root, 'apps/web', productionDistDir(runId));
}

export const developmentDistDir = '.next';

export function webEnvironment({ production, apiUrl, distDir }) {
  const resolvedDistDir = distDir ?? (production ? undefined : developmentDistDir);
  if (!resolvedDistDir) throw new Error('distDir de produção não informado');
  return {
    NODE_ENV: production ? 'production' : 'development',
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_TELEMETRY_DISABLED: '1',
    // Sempre explícito: um .env do projeto não pode trocar o diretório que o
    // runner espera restaurar em cada modo.
    MUVIT_WEB_DIST_DIR: resolvedDistDir,
  };
}

export function generatedNextEnvContent(distDir, eol = '\n') {
  return `${[
    '/// <reference types="next" />',
    '/// <reference types="next/image-types/global" />',
    `import "./${distDir.replaceAll('\\', '/')}/types/routes.d.ts";`,
    '',
    '// NOTE: This file should not be edited',
    '// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.',
  ].join(eol)}${eol}`;
}

export function nextEnvLockPath() {
  return join(root, 'apps/web', '.next-e2e-next-env.lock');
}

export async function readOptionalFile(file, reader = readFile) {
  try {
    return await reader(file, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function defaultIsProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function delay(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

async function readLockSnapshot(lockFile) {
  const content = await readOptionalFile(lockFile);
  if (content === null) return null;
  try {
    return { content, record: JSON.parse(content) };
  } catch {
    return { content, record: null };
  }
}

async function inspectNextEnvLock({ lockFile, hostname, isProcessAlive }) {
  const snapshot = await readLockSnapshot(lockFile);
  if (snapshot === null) return { status: 'missing' };
  const { record } = snapshot;
  if (record === null || typeof record !== 'object') return { status: 'unknown' };
  const details = {
    runId: typeof record.runId === 'string' ? record.runId : undefined,
    hostname: typeof record.hostname === 'string' ? record.hostname : undefined,
    pid: Number.isInteger(record.pid) ? record.pid : undefined,
  };
  if (record.owner !== lockOwner || details.hostname !== hostname || details.pid === undefined)
    return { status: 'unknown', ...details };
  return {
    status: record.pid === process.pid || isProcessAlive(record.pid) ? 'active' : 'stale',
    ...details,
  };
}

export async function acquireNextEnvLock({
  lockFile = nextEnvLockPath(),
  runId,
  timeoutMs = 300000,
  pollMs = 100,
  hostname = currentHostname(),
  isProcessAlive = defaultIsProcessAlive,
  onWait,
  signal,
} = {}) {
  const token = randomBytes(12).toString('hex');
  const payload = JSON.stringify({
    owner: lockOwner,
    runId,
    pid: process.pid,
    hostname,
    token,
    createdAt: new Date().toISOString(),
  });
  const deadline = Date.now() + timeoutMs;
  while (true) {
    signal?.throwIfAborted();
    try {
      await writeFile(lockFile, payload, { encoding: 'utf8', flag: 'wx' });
      return { file: lockFile, token };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
    const state = await inspectNextEnvLock({ lockFile, hostname, isProcessAlive });
    if (state.status === 'missing') continue;
    if (Date.now() >= deadline) {
      const label =
        state.status === 'stale'
          ? 'stale'
          : state.status === 'active'
            ? 'ativo'
            : 'de dono desconhecido';
      throw new Error(
        `Lock ${lockFile} permanece ${label} após ${timeoutMs}ms (runId ${state.runId ?? 'desconhecido'}, host ${state.hostname ?? 'desconhecido'}, pid ${state.pid ?? 'desconhecido'}); inspeção manual é necessária antes de removê-lo. Nenhum lock existente foi movido ou removido automaticamente.`,
      );
    }
    onWait?.(state);
    await delay(pollMs);
    signal?.throwIfAborted();
  }
}

export async function releaseNextEnvLock({ file, token }) {
  const snapshot = await readLockSnapshot(file);
  if (snapshot === null) return;
  if (
    snapshot.record === null ||
    snapshot.record.owner !== lockOwner ||
    snapshot.record.token !== token
  )
    throw new Error(`Lock ${file} não pertence a esta execução; preservado sem remoção.`);
  await unlink(file);
}

export async function runWithNextEnvLock(options, task) {
  const lock = await acquireNextEnvLock(options);
  let taskError = null;
  let result;
  try {
    result = await task(lock);
  } catch (error) {
    taskError = error;
  }
  if (taskError?.retainLock) {
    options.onRetained?.(taskError);
    throw taskError;
  }
  try {
    await releaseNextEnvLock(lock);
  } catch (error) {
    if (!taskError) throw error;
    options.onReleaseFailure?.(error);
  }
  if (taskError) throw taskError;
  return result;
}

export async function restoreGeneratedNextEnv({ file, before, distDir, onWarning, beforeReplace }) {
  const current = await readOptionalFile(file);
  if (current === before) return 'unchanged';
  const eol = current?.includes('\r\n') ? '\r\n' : '\n';
  const expected = generatedNextEnvContent(distDir, eol);
  if (current === null || current !== expected) {
    onWarning?.(current === null ? nextEnvRemovedWarning : nextEnvDivergentWarning);
    return 'preserved';
  }
  if (before === null) {
    await beforeReplace?.();
    const latest = await readOptionalFile(file);
    if (latest !== expected) {
      onWarning?.(nextEnvDivergentWarning);
      return 'preserved';
    }
    await unlink(file);
    return 'removed';
  }
  const temp = `${file}.restore-${randomBytes(6).toString('hex')}`;
  try {
    await writeFile(temp, before, 'utf8');
    await beforeReplace?.();
    const latest = await readOptionalFile(file);
    if (latest !== expected) {
      onWarning?.(nextEnvDivergentWarning);
      return 'preserved';
    }
    await rename(temp, file);
    return 'restored';
  } finally {
    await unlink(temp).catch((error) => {
      if (error?.code !== 'ENOENT') throw error;
    });
  }
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
  let stageError = null;
  let retainedCleanupError = null;
  let result;
  try {
    result = await runWithResources(async (resources) => {
      const trackedResources = {
        registerCleanup(name, cleanup) {
          resources.registerCleanup(name, async () => {
            try {
              await cleanup();
            } catch (error) {
              if (error?.retainLock && !retainedCleanupError) retainedCleanupError = error;
              onCleanupFailure?.(name, error);
              throw error;
            }
          });
        },
      };
      try {
        for (const name of ['database', 'migration', 'api', 'web', 'playwright']) {
          signal?.throwIfAborted();
          await stages[name](trackedResources);
          signal?.throwIfAborted();
        }
      } catch (error) {
        stageError = error;
        throw error;
      }
    });
  } catch (error) {
    // runWithResources agrega falhas de limpeza sem erro primário; preserva a
    // parada não comprovada para que retainLock não seja perdido.
    if (stageError) throw stageError;
    if (retainedCleanupError) throw retainedCleanupError;
    throw error;
  }
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
    detached: options.detached ?? process.platform !== 'win32',
    windowsHide: true,
    stdio: options.ipc ? ['ignore', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'],
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
export class StopNotProvenError extends Error {
  constructor(message, { pid, pids, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'StopNotProvenError';
    this.pid = pid;
    this.pids = pids ?? (pid ? [pid] : []);
    this.stopProven = false;
    this.retainLock = true;
  }
}

export class RestoreNotProvenError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'RestoreNotProvenError';
    this.status = status;
    this.restoreProven = false;
    this.retainLock = true;
    this.retainOutput = true;
  }
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((done) => {
    const deadline = Date.now() + timeoutMs;
    const timer = setInterval(() => {
      if (child.exitCode !== null || child.signalCode !== null) {
        clearInterval(timer);
        done(true);
        return;
      }
      if (Date.now() >= deadline) {
        clearInterval(timer);
        done(false);
      }
    }, 25);
  });
}

function runBoundedCommand(binary, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch {}
      reject(new Error(`Tempo limite ao executar ${binary}`));
    }, timeoutMs);
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', (error) => finish(reject, error));
    child.once('close', (code) => finish(resolve, { code: code ?? 1, stdout, stderr }));
  });
}

async function readWindowsProcessIdentity(pid, timeoutMs) {
  const script = `$p=Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" -ErrorAction Stop;if($null -eq $p){"gone"}elseif($null -eq $p.CreationDate){"unknown"}else{[long]($p.CreationDate.ToUniversalTime().Ticks - 504911232000000000)}`;
  const result = await runBoundedCommand(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    timeoutMs,
  );
  if (result.code !== 0)
    throw new Error(
      `Falha ao consultar a identidade do processo ${pid} (código ${result.code}): ${result.stderr.trim()}`,
    );
  const value = result.stdout.trim();
  if (value === 'gone') return { status: 'gone' };
  if (value === 'unknown') return { status: 'unknown' };
  if (!/^\d+$/.test(value)) throw new Error(`Identidade do processo ${pid} ilegível`);
  return { status: 'present', createdAt: BigInt(value) };
}

export async function listWindowsDescendants(rootPid, timeoutMs, run = runBoundedCommand) {
  const script = `$r=${rootPid};$seen=New-Object 'System.Collections.Generic.HashSet[int]';$q=New-Object 'System.Collections.Generic.Queue[int]';$q.Enqueue($r);while($q.Count -gt 0){$p=$q.Dequeue();foreach($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$p" -ErrorAction Stop)){$k=[int]$child.ProcessId;if($seen.Add($k)){$createdDate=$child.CreationDate;if($null -eq $createdDate){"$k unknown"}else{$created=[long]($createdDate.ToUniversalTime().Ticks - 504911232000000000);"$k $created"};$q.Enqueue($k)}}}`;
  const result = await run(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    timeoutMs,
  );
  if (result.code !== 0)
    throw new Error(
      `Falha ao enumerar descendentes (código ${result.code}): ${result.stderr.trim()}`,
    );
  return result.stdout
    .split(/\r?\n/)
    .map((line) => /^(\d+) (unknown|\d+)$/.exec(line.trim()))
    .filter(Boolean)
    .map((match) => ({
      pid: Number(match[1]),
      createdAt: match[2] === 'unknown' ? null : BigInt(match[2]),
    }))
    .filter((entry) => Number.isSafeInteger(entry.pid) && entry.pid > 0);
}

export async function terminateWindowsOrphans(entries, timeoutMs, run = runBoundedCommand) {
  if (entries.length === 0) return [];
  const known = entries.filter(
    (entry) =>
      Number.isSafeInteger(entry.pid) &&
      entry.pid > 0 &&
      typeof entry.createdAt === 'bigint' &&
      entry.createdAt > 0n,
  );
  const statusByPid = new Map();
  for (const entry of entries) {
    if (!known.includes(entry)) statusByPid.set(entry.pid, 'identity-unknown');
  }
  if (known.length > 0) {
    const payload = known.map((entry) => `${entry.pid}:${entry.createdAt}`).join(',');
    const script = `$ErrorActionPreference = 'Stop'
$source = @'
using System;
using System.Runtime.InteropServices;
public static class MuvitIdentityTerminate {
  [DllImport("kernel32.dll", SetLastError = true)] public static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
  [DllImport("kernel32.dll", SetLastError = true)] public static extern bool GetProcessTimes(IntPtr handle, out long creation, out long exit, out long kernel, out long user);
  [DllImport("kernel32.dll", SetLastError = true)] public static extern bool TerminateProcess(IntPtr handle, uint code);
  [DllImport("kernel32.dll", SetLastError = true)] public static extern bool CloseHandle(IntPtr handle);
  public static string Terminate(uint pid, long expected) {
    IntPtr handle = OpenProcess(0x1001, false, pid);
    if (handle == IntPtr.Zero) return "gone";
    try {
      long creation;
      long exit;
      long kernel;
      long user;
      if (!GetProcessTimes(handle, out creation, out exit, out kernel, out user)) return "unreadable";
      // CIM pode arredondar o último tick do DateTime; 1 ms continua separando
      // uma reutilização real de PID da criação do snapshot.
      if (Math.Abs(creation - expected) > 10000) return "identity-mismatch";
      return TerminateProcess(handle, 1) ? "terminated" : "terminate-failed";
    } finally {
      CloseHandle(handle);
    }
  }
}
'@
Add-Type -TypeDefinition $source -Language CSharp -ErrorAction Stop
foreach ($pair in '${payload}'.Split(',', [System.StringSplitOptions]::RemoveEmptyEntries)) {
  $parts = $pair.Split(':')
  $result = [MuvitIdentityTerminate]::Terminate([uint32]$parts[0], [long]$parts[1])
  "$($parts[0]) $result"
}
`;
    const result = await run(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      timeoutMs,
    );
    if (result.code !== 0)
      throw new Error(
        `Falha ao encerrar descendentes órfãos (código ${result.code}): ${result.stderr.trim()}`,
      );
    for (const line of result.stdout.split(/\r?\n/)) {
      const match = /^(\d+) ([a-z-]+)$/.exec(line.trim());
      if (match) statusByPid.set(Number(match[1]), match[2]);
    }
  }
  return entries.map((entry) => ({
    pid: entry.pid,
    status: statusByPid.get(entry.pid) ?? 'unknown',
  }));
}

async function waitForPidsGone(pids, timeoutMs) {
  const unique = [...new Set(pids)];
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (unique.every((pid) => !defaultIsProcessAlive(pid))) return true;
    await delay(50);
  }
  return unique.every((pid) => !defaultIsProcessAlive(pid));
}

async function waitForGroupGone(signalGroup, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!signalGroup(0)) return true;
    await delay(50);
  }
  return !signalGroup(0);
}

export async function stopChild(
  child,
  {
    timeoutMs = 5000,
    platform = process.platform,
    readLeaderIdentity = readWindowsProcessIdentity,
    listDescendants = listWindowsDescendants,
    runCommand = runBoundedCommand,
    terminateOrphans = terminateWindowsOrphans,
    isProcessAlive = defaultIsProcessAlive,
    waitExit = waitForExit,
    waitPidsGone = waitForPidsGone,
  } = {},
) {
  if (child?.isWindowsJob) {
    try {
      const result = await child.stop({ timeoutMs });
      return { proven: true, pid: result.pid, pids: result.pid ? [result.pid] : [] };
    } catch (error) {
      throw new StopNotProvenError(
        `parada do Job Object ${child.pid || 'não admitido'} não comprovada: ${error.message}`,
        { pid: child.pid, pids: child.pid ? [child.pid] : [], cause: error },
      );
    }
  }
  if (!child.pid || child.spawnFailure) return { proven: true, pid: child.pid, pids: [] };
  const leaderExited = child.exitCode !== null || child.signalCode !== null;
  if (platform === 'win32') {
    if (leaderExited && isProcessAlive(child.pid))
      throw new StopNotProvenError(
        `PID do líder ${child.pid} está ativo após o término registrado; possível reutilização de PID, enumeração e sinalização não são seguras.`,
        { pid: child.pid, pids: [child.pid] },
      );
    // Cada consulta assíncrona pode observar um estado diferente do snapshot.
    // Enquanto o líder estava vivo, qualquer transição para encerrado ou para
    // não vivo invalida a enumeração e impede sinalizar um PID reutilizado.
    const assertLeaderStateUnchanged = (pids) => {
      const nowExited = child.exitCode !== null || child.signalCode !== null;
      if (nowExited !== leaderExited)
        throw new StopNotProvenError(
          nowExited
            ? `O líder ${child.pid} encerrou durante as consultas assíncronas; a árvore não será sinalizada sem identidade comprovada.`
            : `O líder ${child.pid} voltou ao estado vivo durante as consultas assíncronas; a identidade não é segura para sinalizar.`,
          { pid: child.pid, pids },
        );
      if (!leaderExited && !isProcessAlive(child.pid))
        throw new StopNotProvenError(
          `O líder ${child.pid} não está mais vivo durante as consultas assíncronas; a árvore não será sinalizada.`,
          { pid: child.pid, pids },
        );
    };
    let leaderIdentity = null;
    if (!leaderExited) {
      try {
        leaderIdentity = await readLeaderIdentity(child.pid, timeoutMs);
      } catch (error) {
        throw new StopNotProvenError(
          `Não foi possível comprovar a identidade do líder ${child.pid} antes da enumeração: ${error.message}`,
          { pid: child.pid, pids: [child.pid], cause: error },
        );
      }
      assertLeaderStateUnchanged([child.pid]);
      if (leaderIdentity?.status !== 'present')
        throw new StopNotProvenError(
          leaderIdentity?.status === 'gone'
            ? `O líder ${child.pid} encerrou antes da enumeração; a árvore não será sinalizada sem identidade comprovada.`
            : `A identidade do líder ${child.pid} é desconhecida antes da enumeração; a árvore não será sinalizada.`,
          { pid: child.pid, pids: [child.pid] },
        );
    }
    let descendants;
    try {
      descendants = await listDescendants(child.pid, timeoutMs);
    } catch (error) {
      throw new StopNotProvenError(
        `Não foi possível verificar a árvore do processo ${child.pid}: ${error.message}`,
        { pid: child.pid, pids: [child.pid], cause: error },
      );
    }
    const descendantsByPid = new Map(
      descendants.map((entry) =>
        typeof entry === 'number' ? [entry, { pid: entry, createdAt: null }] : [entry.pid, entry],
      ),
    );
    const pids = [child.pid, ...descendantsByPid.keys()];
    assertLeaderStateUnchanged(pids);
    const alive = pids.filter((pid) => isProcessAlive(pid));
    // A amostragem de liveness também é assíncrona. Um líder que estava vivo no
    // snapshot e encerrou ou desapareceu aqui invalida a tentativa: não há
    // fallback ao caminho de órfãos nem prova de parada, porque a árvore não
    // pode ser sinalizada com identidade incerta.
    if (!leaderExited) {
      const nowExited = child.exitCode !== null || child.signalCode !== null;
      if (nowExited)
        throw new StopNotProvenError(
          `O líder ${child.pid} encerrou na amostragem de liveness posterior ao CIM; a árvore não será sinalizada e o caminho de órfãos não será usado.`,
          { pid: child.pid, pids },
        );
      // A ausência já observada em `alive` é evidência definitiva: uma nova
      // consulta a `isProcessAlive` não pode apagá-la reabilitando sucesso ou o
      // caminho de órfãos para um PID cuja identidade deixou de ser segura.
      if (!alive.includes(child.pid))
        throw new StopNotProvenError(
          `O líder ${child.pid} esteve ausente na amostragem de liveness posterior ao CIM; a árvore não será sinalizada e o caminho de órfãos não será usado.`,
          { pid: child.pid, pids },
        );
    }
    if (alive.length === 0) return { proven: true, pid: child.pid, pids };
    if (alive.includes(child.pid)) {
      if (leaderExited)
        throw new StopNotProvenError(
          `PID do líder ${child.pid} reapareceu vivo durante a enumeração após o término registrado; possível reutilização de PID, a árvore não será sinalizada.`,
          { pid: child.pid, pids },
        );
      // A enumeração CIM é assíncrona: a identidade do líder é revalidada como
      // última checagem antes de sinalizar, para não encerrar processo alheio.
      // A criação precisa ser comprovadamente igual ao snapshot; qualquer
      // divergência, mesmo abaixo do arredondamento do CIM, pode ser reuso.
      let revalidated;
      try {
        revalidated = await readLeaderIdentity(child.pid, timeoutMs);
      } catch (error) {
        throw new StopNotProvenError(
          `Não foi possível revalidar a identidade do líder ${child.pid} antes do taskkill: ${error.message}`,
          { pid: child.pid, pids, cause: error },
        );
      }
      assertLeaderStateUnchanged(pids);
      const identityMatches =
        revalidated?.status === 'present' &&
        leaderIdentity?.status === 'present' &&
        typeof leaderIdentity.createdAt === 'bigint' &&
        typeof revalidated.createdAt === 'bigint' &&
        revalidated.createdAt === leaderIdentity.createdAt;
      if (!identityMatches)
        throw new StopNotProvenError(
          `A identidade do líder ${child.pid} mudou ou ficou incerta durante a enumeração; a árvore não será sinalizada.`,
          { pid: child.pid, pids },
        );
      // O líder ainda existe: uma única árvore é sinalizada. Nunca há segundo
      // taskkill por descendente, cujo PID pode ter sido reutilizado.
      let taskkillResult;
      try {
        taskkillResult = await runCommand(
          'taskkill.exe',
          ['/PID', String(child.pid), '/T', '/F'],
          timeoutMs,
        );
      } catch (error) {
        throw new StopNotProvenError(
          `taskkill da árvore ${child.pid} não concluiu: ${error.message}`,
          { pid: child.pid, pids, cause: error },
        );
      }
      if (taskkillResult?.code !== 0)
        throw new StopNotProvenError(
          `taskkill da árvore ${child.pid} falhou com código ${taskkillResult?.code ?? 'desconhecido'}${taskkillResult?.stderr?.trim() ? `: ${taskkillResult.stderr.trim()}` : ''}; a parada não será declarada apenas pela ausência posterior dos PIDs.`,
          { pid: child.pid, pids },
        );
    } else {
      // O líder já terminou: a árvore não pode ser sinalizada pelo root. Só
      // encerra descendentes do snapshot após comprovar a criação do processo
      // em um handle aberto; sem identidade provada, falha fechado.
      const orphans = [...descendantsByPid.values()].filter((entry) => alive.includes(entry.pid));
      let outcomes;
      try {
        outcomes = await terminateOrphans(orphans, timeoutMs);
      } catch (error) {
        throw new StopNotProvenError(
          `não foi possível encerrar descendentes órfãos de ${child.pid}: ${error.message}`,
          { pid: child.pid, pids, cause: error },
        );
      }
      const unproven = outcomes.filter(
        (outcome) => outcome.status !== 'terminated' && outcome.status !== 'gone',
      );
      if (unproven.length > 0)
        throw new StopNotProvenError(
          `identidade de descendente não comprovada; PID não será sinalizado: ${unproven
            .map((outcome) => `${outcome.pid} (${outcome.status})`)
            .join(', ')}.`,
          { pid: child.pid, pids },
        );
    }
    const exitProven = leaderExited || (await waitExit(child, timeoutMs));
    if ((await waitPidsGone(pids, timeoutMs)) && exitProven)
      return { proven: true, pid: child.pid, pids };
    const remaining = pids.filter((pid) => isProcessAlive(pid));
    throw new StopNotProvenError(
      `Processos remanescentes após a tentativa de parada: ${remaining.join(', ') || 'exit/close não confirmado'}.`,
      { pid: child.pid, pids },
    );
  }
  if (leaderExited && defaultIsProcessAlive(child.pid))
    throw new StopNotProvenError(
      `PID do líder ${child.pid} está ativo após o término registrado; possível reutilização de PID, o grupo não será sinalizado.`,
      { pid: child.pid, pids: [child.pid] },
    );
  const signalGroup = (signal) => {
    try {
      process.kill(-child.pid, signal);
      return true;
    } catch (error) {
      if (error.code === 'ESRCH') return false;
      throw error;
    }
  };
  // O líder pode sair naturalmente enquanto descendentes detached ainda ocupam o PGID conhecido
  // (child.pid); só a ausência comprovada do grupo autoriza declarar a parada como provada.
  if (!signalGroup('SIGTERM')) return { proven: true, pid: child.pid, pids: [child.pid] };
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    await delay(50);
    if (!signalGroup(0)) return { proven: true, pid: child.pid, pids: [child.pid] };
  }
  signalGroup('SIGKILL');
  if (
    (await waitForGroupGone(signalGroup, timeoutMs)) &&
    (leaderExited || (await waitForExit(child, timeoutMs)))
  )
    return { proven: true, pid: child.pid, pids: [child.pid] };
  throw new StopNotProvenError(
    `Não foi possível comprovar o encerramento do grupo de processos ${child.pid}.`,
    { pid: child.pid, pids: [child.pid] },
  );
}
export async function writeCommandArtifactLog(artifactDir, label, output, secrets) {
  await writeFile(
    join(artifactDir, `${label}.log`),
    sanitizeRecursively(output ?? '', secrets),
    'utf8',
  );
}

export async function finalizeRunReport({
  artifactDir,
  report,
  primaryError = null,
  writeReport = writeFile,
  secrets = [],
} = {}) {
  try {
    await writeReport(
      join(artifactDir, 'report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
    return;
  } catch (error) {
    if (!primaryError) throw error;
    report.cleanupErrors.push({
      resource: 'report-json',
      error: sanitizeRecursively(
        error instanceof Error ? error.message : 'Erro desconhecido',
        secrets,
      ),
    });
    if (typeof primaryError === 'object' && !('reportWriteFailure' in primaryError))
      primaryError.reportWriteFailure = error;
    throw primaryError;
  }
}

export function createCommandRunner({
  artifactDir,
  secrets,
  signal,
  onFailure = () => {},
  writeLog = writeCommandArtifactLog,
  execute = runAbortableCommand,
  timeoutMs = 180000,
}) {
  return async (label, binary, args, options) => {
    let result;
    try {
      result = await execute(binary, args, {
        ...options,
        signal,
        timeoutMs,
        onStopFailure: (error) => onFailure(`${label}-process`, error),
      });
    } catch (error) {
      const output = [error?.message, error?.diagnostic ?? error?.output]
        .filter(Boolean)
        .join('\n');
      try {
        await writeLog(artifactDir, label, output, secrets);
      } catch (logError) {
        onFailure(`artifact-log-${label}`, logError);
        if (error && typeof error === 'object' && !('artifactLogFailure' in error)) {
          error.artifactLogFailure = logError;
        }
      }
      throw error;
    }
    await writeLog(artifactDir, label, `${result.stdout}\n${result.stderr}`, secrets);
    signal?.throwIfAborted();
    return success(result, label);
  };
}

async function runWindowsJobCommand(binary, commandName, commandArgs, options, verbatim) {
  const stopTimeoutMs = options.stopTimeoutMs ?? 5000;
  const session = startWindowsJob(commandName, commandArgs, {
    cwd: options.cwd,
    env: options.env,
    stdin: options.stdin,
    windowsVerbatimArguments: verbatim,
    stopTimeoutMs,
    startupTimeoutMs: options.startupTimeoutMs,
    onOutput: options.onOutput,
    testHook: options.jobTestHook,
    testDelayMs: options.jobTestDelayMs,
    supervisorScript: options.supervisorScript,
    signal: options.signal,
  });
  options.onSpawn?.(session);
  const stopFailure = (message, cause) => {
    const failure = new StopNotProvenError(message, {
      pid: session.pid,
      pids: session.pid ? [session.pid] : [],
      cause,
    });
    const diagnostic = session.diagnosticOutput?.() ?? '';
    if (diagnostic) {
      failure.diagnostic = diagnostic;
      failure.output = diagnostic;
    }
    return failure;
  };
  let cancellation;
  let stopError;
  let resolveCancelled;
  const cancelled = new Promise((done) => {
    resolveCancelled = done;
  });
  let stopPromise;
  const runStop = () => {
    stopPromise ??= session.stop({ timeoutMs: stopTimeoutMs }).catch((error) => {
      stopError = error;
      options.onStopFailure?.(error);
      throw error;
    });
    return stopPromise;
  };
  const cancel = (reason) => {
    if (cancellation) return;
    cancellation = reason;
    runStop()
      .catch(() => {})
      .finally(resolveCancelled);
  };
  const onAbort = () => cancel(options.signal.reason);
  options.signal?.addEventListener('abort', onAbort, { once: true });
  if (options.signal?.aborted) onAbort();
  const timer = setTimeout(
    () => cancel(new Error('Tempo limite do subprocesso')),
    options.timeoutMs ?? 120000,
  );
  try {
    const completion = session.completion();
    const outcome = await Promise.race([
      completion.then((value) => ({ value })),
      cancelled.then(() => ({ cancelled: true })),
    ]);
    if (outcome.cancelled || cancellation) {
      await runStop().catch(() => {});
      if (stopError)
        throw stopFailure(
          `Parada do subprocesso ${binary} não comprovada: ${stopError.message}`,
          stopError,
        );
      throw cancellation;
    }
    return outcome.value;
  } catch (error) {
    if (stopError)
      throw stopFailure(
        `Parada do subprocesso ${binary} não comprovada: ${stopError.message}`,
        stopError,
      );
    if (error?.stopProven === false || error?.name === 'WindowsJobError')
      throw stopFailure(
        `Parada do Job Object do subprocesso ${binary} não comprovada: ${error.message}`,
        error,
      );
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
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
  if (process.platform === 'win32' && options.windowsJob)
    return runWindowsJobCommand(binary, commandName, commandArgs, options, batch);
  const child = startChild(commandName, commandArgs, {
    cwd: options.cwd,
    env: options.env,
    onOutput: options.onOutput,
    detached: options.detached,
    windowsVerbatimArguments: batch,
  });
  options.onSpawn?.(child);
  let cancellation;
  let stop;
  let stopError;
  let resolveCancelled;
  const stopTimeoutMs = options.stopTimeoutMs ?? 5000;
  const stopProcess =
    options.stopChild ?? ((processChild) => stopChild(processChild, { timeoutMs: stopTimeoutMs }));
  let stopPromise;
  const runStop = () => {
    if (stopPromise) return stopPromise;
    let stopTimer;
    const deadline = new Promise((_, fail) => {
      stopTimer = setTimeout(
        () => fail(new Error('Tempo limite ao encerrar subprocesso')),
        stopTimeoutMs + 1000,
      );
    });
    stopPromise = Promise.race([stopProcess(child), deadline]).finally(() =>
      clearTimeout(stopTimer),
    );
    return stopPromise;
  };
  const cancelled = new Promise((done) => {
    resolveCancelled = done;
  });
  const cancel = (reason) => {
    if (cancellation) return;
    cancellation = reason;
    stop = runStop()
      .catch((error) => {
        stopError = error;
        options.onStopFailure?.(error);
      })
      .finally(resolveCancelled);
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
    if (cancellation) {
      if (stop) await stop;
      if (stopError)
        throw new StopNotProvenError(
          `Parada do subprocesso ${binary} não comprovada: ${stopError.message}`,
          { pid: child.pid, pids: stopError.pids, cause: stopError },
        );
      throw cancellation;
    }
    clearTimeout(timer);
    // O close do líder não prova que descendentes detached terminaram. A ausência
    // precisa ser comprovada antes de o caller restaurar next-env.d.ts e liberar o lock.
    try {
      const settled = await runStop();
      if (settled?.proven === false)
        throw new Error('parada não comprovada após o término do subprocesso');
    } catch (error) {
      options.onStopFailure?.(error);
      const pids = error?.pids ?? (error?.pid ? [error.pid] : child.pid ? [child.pid] : []);
      throw new StopNotProvenError(
        `Parada do subprocesso ${binary} não comprovada após o término: ${error.message}`,
        { pid: child.pid, pids, cause: error },
      );
    }
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
    if (child.failure) throw child.failure;
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
  let mailbox;
  const report = {
    runId,
    artifactDir,
    ports: options.ports,
    scenario: options.scenario,
    bundler: options.webpack ? 'webpack' : 'turbopack',
    mode: options.production ? 'production' : 'development',
    distDir: options.production ? productionDistDir(runId) : null,
    status: 'failed',
    cleanupErrors: [],
    cleanupWarnings: [],
  };
  await mkdir(artifactDir, { recursive: true });
  const controller = new AbortController();
  let primaryError = null;
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
  const command = createCommandRunner({
    artifactDir,
    secrets,
    signal: controller.signal,
    onFailure: recordCleanupFailure,
  });
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
          mailbox = await createMailbox();
          secrets.push(mailbox.secret);
          resources.registerCleanup('mailbox', () => mailbox.close());
          const child = startChild(process.execPath, ['--import', 'tsx', 'test/e2e-server.ts'], {
            ipc: true,
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
          child.on('message', (event) => {
            if (event?.type === 'verification') mailbox.deliver(event.message);
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
          const distDir = options.production ? productionDistDir(runId) : null;
          const webEnv = webEnvironment({
            production: options.production,
            apiUrl,
            distDir,
          });
          const nextEnvFile = join(root, 'apps/web/next-env.d.ts');
          let nextEnvBefore = null;
          let outputRetained = false;
          let serverStarted = false;
          let serverStopProven = false;
          let restoreProven = false;
          const warnNextEnv = (message) => {
            if (!report.cleanupWarnings.includes(message)) report.cleanupWarnings.push(message);
          };
          const restoreNextEnv = (restoreDistDir) =>
            restoreGeneratedNextEnv({
              file: nextEnvFile,
              before: nextEnvBefore,
              distDir: restoreDistDir,
              onWarning: warnNextEnv,
            });
          if (distDir) {
            resources.registerCleanup('dist-dir', async () => {
              if (outputRetained || (serverStarted && !serverStopProven)) {
                warnNextEnv(
                  `runId ${runId}: distDir ${distDir} preservado porque a parada/restauração não foi comprovada.`,
                );
                return;
              }
              await rm(distDirAbsolute(runId), {
                recursive: true,
                force: true,
                maxRetries: 5,
                retryDelay: 100,
              });
            });
            await runWithNextEnvLock(
              {
                lockFile: nextEnvLockPath(),
                runId,
                signal: controller.signal,
                onReleaseFailure: (error) => recordCleanupFailure('next-env-lock', error),
                onRetained: (error) => {
                  const pids = error.pids?.length
                    ? error.pids.join(', ')
                    : (error.pid ?? 'desconhecido');
                  recordCleanupFailure(
                    'lock-retained',
                    new Error(
                      `runId ${runId}: lock preservado após parada/restauração não comprovada (pids ${pids}); distDir ${distDir} preservado.`,
                    ),
                  );
                },
              },
              async () => {
                try {
                  nextEnvBefore = await readOptionalFile(nextEnvFile);
                } catch (error) {
                  recordCleanupFailure('next-env-read', error);
                  throw error;
                }
                let buildError = null;
                try {
                  await command(
                    'build',
                    pnpm,
                    [
                      '--dir',
                      'apps/web',
                      'run',
                      'build',
                      options.webpack ? '--webpack' : '--turbopack',
                    ],
                    { cwd: root, env: env(webEnv), windowsJob: true },
                  );
                } catch (error) {
                  buildError = error;
                }
                if (buildError?.stopProven === false) {
                  outputRetained = true;
                  const pids = buildError.pids?.length
                    ? buildError.pids.join(', ')
                    : (buildError.pid ?? 'desconhecido');
                  const detail = new StopNotProvenError(
                    `runId ${runId}: ${buildError.message} (pids ${pids}); next-env.d.ts, lock e distDir ${distDir} preservados.`,
                    { pid: buildError.pid, pids: buildError.pids, cause: buildError },
                  );
                  recordCleanupFailure('build-stop', detail);
                  throw detail;
                }
                let restoreStatus;
                let restoreError = null;
                try {
                  restoreStatus = await restoreNextEnv(distDir);
                } catch (error) {
                  restoreError = error;
                }
                if (restoreError || restoreStatus === 'preserved') {
                  outputRetained = true;
                  if (buildError) recordCleanupFailure('build', buildError);
                  const detail = new RestoreNotProvenError(
                    `runId ${runId}: restauração de next-env.d.ts não comprovada (${restoreError ? `erro ${restoreError.message}` : `status ${restoreStatus}`}); lock e distDir ${distDir} preservados.`,
                    {
                      status: restoreError ? 'error' : restoreStatus,
                      cause: restoreError ?? undefined,
                    },
                  );
                  recordCleanupFailure('next-env-restore', detail);
                  throw detail;
                }
                restoreProven = true;
                if (buildError) throw buildError;
              },
            );
          } else {
            const lock = await acquireNextEnvLock({
              lockFile: nextEnvLockPath(),
              runId,
              signal: controller.signal,
              onReleaseFailure: (error) => recordCleanupFailure('next-env-lock', error),
            });
            resources.registerCleanup('lock', async () => {
              if (serverStarted && (!serverStopProven || !restoreProven)) {
                const reason = !serverStopProven
                  ? 'a parada do next dev não foi comprovada'
                  : 'a restauração de next-env.d.ts não foi comprovada';
                recordCleanupFailure(
                  'lock-retained',
                  new Error(
                    `runId ${runId}: lock preservado porque ${reason} (pid ${serverStarted ? child.pid : 'não iniciado'}); next-env.d.ts e lock preservados.`,
                  ),
                );
                return;
              }
              await releaseNextEnvLock(lock);
            });
            try {
              nextEnvBefore = await readOptionalFile(nextEnvFile);
            } catch (error) {
              recordCleanupFailure('next-env-read', error);
              throw error;
            }
            resources.registerCleanup('next-env', async () => {
              if (!serverStarted) {
                restoreProven = true;
                return;
              }
              if (!serverStopProven) {
                warnNextEnv(
                  `runId ${runId}: next-env.d.ts não restaurado porque a parada do next dev não foi comprovada.`,
                );
                return;
              }
              // O config do dev usa distDir .next; o plugin de tipos do Next
              // grava as rotas de desenvolvimento em .next/dev.
              const status = await restoreNextEnv('.next/dev');
              if (status === 'preserved') {
                throw new RestoreNotProvenError(
                  `runId ${runId}: restauração de next-env.d.ts não comprovada (status preserved); lock preservado.`,
                  { status },
                );
              }
              restoreProven = true;
            });
          }
          const child =
            process.platform === 'win32'
              ? startWindowsJob(
                  process.execPath,
                  options.production ? nextStartArgs(options) : nextDevArgs(options),
                  {
                    cwd: join(root, 'apps/web'),
                    env: env(webEnv),
                    stopTimeoutMs: 5000,
                    signal: controller.signal,
                  },
                )
              : startChild(
                  process.execPath,
                  options.production ? nextStartArgs(options) : nextDevArgs(options),
                  {
                    cwd: join(root, 'apps/web'),
                    env: env(webEnv),
                  },
                );
          serverStarted = true;
          resources.registerCleanup('web-log', () =>
            writeFile(
              join(artifactDir, 'web.log'),
              sanitizeRecursively(child.output(), secrets),
              'utf8',
            ),
          );
          resources.registerCleanup('web', async () => {
            await stopChild(child);
            serverStopProven = true;
          });
          if (child.isWindowsJob)
            try {
              await child.ready;
            } catch (error) {
              throw new StopNotProvenError(
                `runId ${runId}: admissão do Job Object do Next não comprovada: ${error.message}`,
                { pid: child.pid, pids: child.pid ? [child.pid] : [], cause: error },
              );
            }
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
                WEB_E2E_MAILBOX_URL: mailbox.url,
                WEB_E2E_MAILBOX_SECRET: mailbox.secret,
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
    primaryError = error;
    report.error = sanitizeRecursively(
      error instanceof Error ? error.message : 'Erro desconhecido',
      secrets,
    );
    throw error;
  } finally {
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onTerminate);
    await finalizeRunReport({ artifactDir, report, primaryError, secrets });
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help)
      process.stdout.write(
        'Uso: node scripts/web-e2e.mjs [--scenario all|jornada|isolamento|confirmacao-email] [--web-port porta] [--api-port porta] [--db-port porta] [--artifact-scope slug] [--headed] [--webpack] [--production]\n',
      );
    else process.stdout.write(`${JSON.stringify(await run(options), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Erro desconhecido'}\n`);
    process.exitCode = typeof error?.exitCode === 'number' ? error.exitCode : 1;
  }
}
