import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_STARTUP_TIMEOUT_MS,
  resolveStartupTimeoutMs,
  startWindowsJob,
  windowsCommandLine,
  windowsJobScriptPath,
} from './web-e2e-windows-job.mjs';
import { StopNotProvenError, runAbortableCommand, runWithNextEnvLock } from './web-e2e.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ADMISSION_TIMEOUT_MS = DEFAULT_STARTUP_TIMEOUT_MS;
const windowsOnly =
  process.platform === 'win32'
    ? {}
    : { skip: 'Job Object e CreateProcessW são específicos do Windows' };
const powershell = join(
  process.env.SystemRoot ?? 'C:\\Windows',
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'powershell.exe',
);
const powerShellArgumentHelper = String.raw`
function ConvertTo-MuvitProcessArgument {
  param([AllowEmptyString()][string]$Value)
  if ($Value -eq '') { return '""' }
  if ($Value -notmatch '[\s"]') { return $Value }
  $builder = New-Object System.Text.StringBuilder
  [void]$builder.Append('"')
  $backslashes = 0
  foreach ($character in $Value.ToCharArray()) {
    if ($character -eq '\') { $backslashes++; continue }
    if ($character -eq '"') {
      [void]$builder.Append(('\' * ($backslashes * 2 + 1)))
      [void]$builder.Append('"')
      $backslashes = 0
      continue
    }
    if ($backslashes -gt 0) {
      [void]$builder.Append(('\' * $backslashes))
      $backslashes = 0
    }
    [void]$builder.Append($character)
  }
  if ($backslashes -gt 0) { [void]$builder.Append(('\' * ($backslashes * 2))) }
  [void]$builder.Append('"')
  return $builder.ToString()
}
function Join-MuvitProcessArguments {
  param([string[]]$Values)
  return (($Values | ForEach-Object { ConvertTo-MuvitProcessArgument $_ }) -join ' ')
}
`;

function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function inheritedEnvironment(extra = {}) {
  return {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.includes('='))),
    ...extra,
  };
}

function delay(milliseconds) {
  return new Promise((done) => setTimeout(done, milliseconds));
}

async function waitFor(predicate, timeoutMs = 5000, intervalMs = 25) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await delay(intervalMs);
  }
  return predicate();
}

function writeMarkerScript(marker) {
  return `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executou')`;
}

async function waitGone(pids, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (pids.every((pid) => !isAlive(pid))) return true;
    await new Promise((done) => setTimeout(done, 50));
  }
  return pids.every((pid) => !isAlive(pid));
}

async function killTracked(pids) {
  for (const pid of pids) {
    if (isAlive(pid)) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
  }
  await waitGone(pids, 2000);
}

function baseOptions(overrides = {}) {
  return {
    cwd: root,
    env: inheritedEnvironment(),
    stopTimeoutMs: 5000,
    startupTimeoutMs: ADMISSION_TIMEOUT_MS,
    ...overrides,
  };
}

test('janela padrão de admissão Windows é 40s e aceita override explícito', () => {
  assert.equal(DEFAULT_STARTUP_TIMEOUT_MS, 40000);
  assert.equal(resolveStartupTimeoutMs({}), 40000);
  assert.equal(resolveStartupTimeoutMs({ startupTimeoutMs: 2500 }), 2500);
});

function transcriptOf(transcript) {
  if (Array.isArray(transcript)) return { frames: [], lines: transcript };
  return { frames: transcript.frames ?? [], lines: transcript.lines ?? [] };
}

function isConfigLine(text) {
  return /^(app|cmd|cwd|stdin|stop|env|end)( |$)/.test(text);
}

function assertAuthTranscriptOrder(transcript, { framing = true } = {}) {
  const { frames, lines } = transcriptOf(transcript);
  assert.ok(lines.length > 0, 'transcript sem linhas');
  if (framing) {
    assert.ok(frames.length > 0, 'transcript sem framing bruto');
    const frameOffsetByChannel = new Map();
    for (const [index, frame] of frames.entries()) {
      assert.equal(frame.sequence, index + 1, 'sequência do framing fora de ordem');
      assert.ok(frame.bytes > 0, `frame vazio em ${frame.pipe}:${frame.direction}`);
      assert.equal(
        frame.bytes,
        Buffer.byteLength(frame.data, 'utf8'),
        'bytes do frame divergem do dado',
      );
      const channel = `${frame.pipe}:${frame.direction}`;
      const expectedOffset = frameOffsetByChannel.get(channel) ?? 0;
      assert.equal(frame.offset, expectedOffset, `offset do frame fora de ordem em ${channel}`);
      frameOffsetByChannel.set(channel, expectedOffset + frame.bytes);
    }
    const writeFrames = frames.filter((frame) => frame.direction === 'write');
    assert.ok(
      writeFrames.some((frame) => !frame.data.endsWith('\n')),
      'transcript não registrou fragmento real de escrita',
    );
    const lineOffsetByChannel = new Map();
    for (const [index, line] of lines.entries()) {
      assert.equal(line.sequence, index + 1, 'sequência da transcrição fora de ordem');
      assert.equal(line.terminated, true, `linha sem delimitador: ${JSON.stringify(line.text)}`);
      assert.ok(
        line.bytes > Buffer.byteLength(line.text, 'utf8'),
        'linha sem bytes de delimitador',
      );
      const channel = `${line.pipe}:${line.direction}`;
      const expectedOffset = lineOffsetByChannel.get(channel) ?? 0;
      assert.equal(line.offset, expectedOffset, `offset de bytes fora de ordem em ${channel}`);
      lineOffsetByChannel.set(channel, expectedOffset + line.bytes);
    }
  }
  const challenge = lines.findIndex(
    (line) => line.pipe === 'in' && line.direction === 'read' && line.text.startsWith('challenge '),
  );
  assert.notEqual(challenge, -1, 'transcript sem challenge');
  const challengeFields = lines[challenge].text.split(' ');
  assert.equal(challengeFields.length, 3, 'challenge não carrega nonce por transporte');
  assert.notEqual(challengeFields[1], challengeFields[2], 'nonce reutilizado entre transportes');
  const inputAuth = lines.findIndex(
    (line) => line.pipe === 'in' && line.direction === 'write' && line.text.startsWith('auth '),
  );
  assert.notEqual(inputAuth, -1, 'transcript sem prova HMAC de entrada');
  assert.ok(inputAuth > challenge, 'prova HMAC de entrada veio antes do challenge');
  const eventAuth = lines.findIndex(
    (line) => line.pipe === 'out' && line.direction === 'write' && line.text.startsWith('auth '),
  );
  assert.notEqual(eventAuth, -1, 'transcript sem prova HMAC de saída');
  assert.match(lines[eventAuth].text, /^auth [A-Za-z0-9_-]{43}$/);
  assert.notEqual(
    lines[eventAuth].text,
    lines[inputAuth].text,
    'mesma prova usada nos dois transportes',
  );
  const proofsComplete = Math.max(inputAuth, eventAuth);
  const earlyConfig = lines.findIndex(
    (line, index) =>
      index < proofsComplete &&
      line.pipe === 'in' &&
      line.direction === 'read' &&
      isConfigLine(line.text),
  );
  assert.equal(earlyConfig, -1, 'configuração enfileirada antes das provas HMAC');
  const firstConfig = lines.findIndex(
    (line) => line.pipe === 'in' && line.direction === 'read' && isConfigLine(line.text),
  );
  assert.ok(firstConfig > proofsComplete, 'configuração não chegou depois das duas provas HMAC');
  const firstEvent = lines.findIndex(
    (line) =>
      line.pipe === 'out' &&
      line.direction === 'write' &&
      /^(ready|leader-exit|stopped|error)( |$)/.test(line.text),
  );
  assert.ok(firstEvent > eventAuth, 'evento entregue antes da prova HMAC de saída');
  return { challenge, inputAuth, eventAuth, firstConfig, firstEvent };
}

test(
  'Windows executa comando real com código, cwd, ambiente e argumentos preservados',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit job ç '));
    try {
      const script =
        "process.stdout.write(JSON.stringify([process.cwd(),process.env.MUVIT_ALVO,process.argv.slice(1)]));process.stderr.write('erro');";
      const session = startWindowsJob(
        process.execPath,
        ['-e', script, '', 'a b', 'a"b', 'a\\', 'a b\\'],
        baseOptions({ cwd: dir, env: inheritedEnvironment({ MUVIT_ALVO: 'acentuação ✓' }) }),
      );
      session.on('error', () => {});
      const result = await session.completion();
      assert.equal(result.code, 0);
      assert.equal(result.stderr, 'erro');
      const [cwd, target, args] = JSON.parse(result.stdout);
      assert.equal(cwd.toLowerCase(), dir.toLowerCase());
      assert.equal(target, 'acentuação ✓');
      assert.deepEqual(args, ['', 'a b', 'a"b', 'a\\', 'a b\\']);
      assert.deepEqual(await session.stop(), { proven: true, pid: session.pid });
      assert.deepEqual(await session.completion(), result);
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows drena stdout e stderr grandes concorrentes, Unicode dividido e stdin com EOF',
  windowsOnly,
  async () => {
    const block = 'á✓\\n'.repeat(2000);
    const script = `
      const block = ${JSON.stringify(block)};
      let input = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => { input += chunk; });
      process.stdin.on('end', () => {
        const writes = [];
        for (let i = 0; i < 100; i++) {
          writes.push(new Promise((done) => process.stdout.write(block, done)));
          writes.push(new Promise((done) => process.stderr.write(block, done)));
        }
        Promise.all(writes).then(() => process.stdout.write('[' + input + ']FIM'));
      });
    `;
    const session = startWindowsJob(
      process.execPath,
      ['-e', script],
      baseOptions({ stdin: 'linha um\nlinha dois ✓' }),
    );
    session.on('error', () => {});
    const result = await session.completion();
    assert.equal(result.code, 0);
    assert.ok(result.stdout.endsWith('[linha um\nlinha dois ✓]FIM'));
    assert.equal(result.stdout.length, block.length * 100 + '[linha um\nlinha dois ✓]FIM'.length);
    assert.equal(result.stderr.length, block.length * 100);
    assert.equal(result.stdout.includes(String.fromCharCode(0xfffd)), false);
    assert.equal(result.stderr.includes(String.fromCharCode(0xfffd)), false);
  },
);

test('Windows mata neto cujo intermediário já morreu antes do stop', windowsOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-job-dead-intermediate-'));
  const pidFile = join(dir, 'grandchild.pid');
  const grandchildCode = 'setInterval(() => {}, 1000)';
  const intermediateCode = `const { spawn } = require('node:child_process'); const { writeFileSync } = require('node:fs'); const g = spawn(process.execPath, ['-e', ${JSON.stringify(grandchildCode)}], { stdio: 'ignore', detached: true }); g.unref(); writeFileSync(${JSON.stringify(pidFile)}, String(g.pid));`;
  const rootCode = `const { spawn } = require('node:child_process'); const c = spawn(process.execPath, ['-e', ${JSON.stringify(intermediateCode)}], { stdio: 'ignore' }); c.unref(); process.stdout.write(String(c.pid)); setInterval(() => {}, 1000);`;
  let session;
  let grandchildPid = 0;
  try {
    session = startWindowsJob(process.execPath, ['-e', rootCode], baseOptions());
    session.on('error', () => {});
    const ready = await session.ready;
    const deadline = Date.now() + 10000;
    while (!grandchildPid && Date.now() < deadline) {
      try {
        grandchildPid = Number(await readFile(pidFile, 'utf8'));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await new Promise((done) => setTimeout(done, 50));
      }
    }
    assert.ok(grandchildPid > 0, 'neto não registrou PID');
    assert.equal(isAlive(grandchildPid), true, 'neto não estava vivo antes do stop');
    assert.equal(isAlive(ready.pid), true, 'raiz não estava viva antes do stop');
    assert.deepEqual(await session.stop(), { proven: true, pid: ready.pid });
    assert.equal(await waitGone([ready.pid, grandchildPid]), true, 'processo sobreviveu ao stop');
  } finally {
    if (session) await killTracked([session.pid, grandchildPid]);
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test(
  'Windows encerra descendente que retém os pipes antes de devolver o código do líder',
  windowsOnly,
  async () => {
    const leaderCode = `const { spawn } = require('node:child_process'); const d = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'inherit' }); d.unref(); process.stdout.write(String(d.pid));`;
    let session;
    let descendantPid = 0;
    try {
      session = startWindowsJob(process.execPath, ['-e', leaderCode], baseOptions());
      session.on('error', () => {});
      const result = await session.completion();
      descendantPid = Number(result.stdout);
      assert.equal(result.code, 0);
      assert.ok(descendantPid > 0);
      assert.equal(await waitGone([session.pid, descendantPid]), true, 'descendente sobreviveu');
    } finally {
      if (session) await killTracked([session.pid, descendantPid]);
    }
  },
);

test(
  'Windows abort e timeout usam a prova do job e devolvem o erro original',
  windowsOnly,
  async () => {
    const controller = new AbortController();
    const descendantCode = 'setInterval(() => {}, 1000)';
    const leaderCode = `const { spawn } = require('node:child_process'); const d = spawn(process.execPath, ['-e', ${JSON.stringify(descendantCode)}], { stdio: 'ignore' }); d.unref(); process.stdout.write(String(d.pid)); setInterval(() => {}, 1000);`;
    let descendantPid = 0;
    try {
      await assert.rejects(
        runAbortableCommand(process.execPath, ['-e', leaderCode], {
          ...baseOptions(),
          signal: controller.signal,
          timeoutMs: ADMISSION_TIMEOUT_MS,
          windowsJob: true,
          onOutput: (stdout) => {
            const value = Number(stdout.trim());
            if (!descendantPid && Number.isInteger(value) && value > 0) {
              descendantPid = value;
              controller.abort(new Error('cancelado pelo teste'));
            }
          },
        }),
        (error) => error.message === 'cancelado pelo teste',
      );
      assert.ok(descendantPid > 0);
      assert.equal(await waitGone([descendantPid]), true, 'descendente sobreviveu ao abort');
    } finally {
      await killTracked([descendantPid]);
    }

    await assert.rejects(
      runAbortableCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
        ...baseOptions(),
        timeoutMs: 300,
        windowsJob: true,
      }),
      (error) => error instanceof StopNotProvenError || /Tempo limite/.test(error.message),
    );
  },
);

test('Windows prazo de parada e confirmação tardia não viram sucesso', windowsOnly, async () => {
  for (const testHook of ['hang-stop', 'stop-delay']) {
    const session = startWindowsJob(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
      ...baseOptions(),
      testHook,
      testDelayMs: 1500,
    });
    session.on('error', () => {});
    try {
      await session.ready;
      await assert.rejects(session.stop({ timeoutMs: 500 }), (error) => {
        assert.equal(error.name, 'WindowsJobStopError');
        assert.equal(error.retainLock, true);
        return /não chegou em 500ms/.test(error.message);
      });
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
    }
  }

  const failure = await runAbortableCommand(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
    ...baseOptions(),
    jobTestHook: 'hang-stop',
    timeoutMs: 5000,
    stopTimeoutMs: 300,
    windowsJob: true,
  }).catch((error) => error);
  assert.equal(failure.name, 'StopNotProvenError', failure.stack);
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  assert.equal(failure.cause?.name, 'WindowsJobStopError');
  assert.equal(failure.cause?.stage, 'stop-timeout');
  assert.match(failure.message, /não comprovada/);
  assert.match(failure.message, /300ms/);
});

test(
  'Windows kill-on-close cobre a morte do supervisor e o monitor cobre a do Node pai',
  windowsOnly,
  async () => {
    const leaderCode = `const { spawn } = require('node:child_process'); const d = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' }); d.unref(); process.stdout.write(String(d.pid)); setInterval(() => {}, 1000);`;
    let session;
    let descendantPid = 0;
    try {
      session = startWindowsJob(process.execPath, ['-e', leaderCode], baseOptions());
      session.on('error', () => {});
      const ready = await session.ready;
      await new Promise((done) => setTimeout(done, 300));
      descendantPid = Number(session.result().stdout.trim().split('\n')[0]);
      const supervisorPid = session.supervisorPid;
      process.kill(supervisorPid, 'SIGKILL');
      assert.equal(
        await waitGone([ready.pid, descendantPid, supervisorPid]),
        true,
        'job sobreviveu à morte do supervisor',
      );
    } finally {
      if (session) await killTracked([session.pid, descendantPid, session.supervisorPid]);
    }

    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-parent-kill-'));
    const infoFile = join(dir, 'info.json');
    const childScript = `
      import { writeFileSync } from 'node:fs';
      import { startWindowsJob } from ${JSON.stringify(`file:///${join(root, 'scripts/web-e2e-windows-job.mjs').replaceAll('\\', '/')}`)};
      const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.includes('=')));
      const session = startWindowsJob(process.execPath, ['-e', ${JSON.stringify(leaderCode)}], { cwd: ${JSON.stringify(root)}, env, stopTimeoutMs: 5000 });
      session.on('error', () => {});
      const ready = await session.ready;
      await new Promise((done) => setTimeout(done, 400));
      const descendant = Number(session._stdoutText.trim().split('\\n')[0]);
      writeFileSync(${JSON.stringify(infoFile)}, JSON.stringify({ leader: ready.pid, descendant, supervisor: session.supervisorPid }));
      setInterval(() => {}, 1000);
    `;
    const parent = spawn(process.execPath, ['--input-type=module', '-e', childScript], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    try {
      const deadline = Date.now() + ADMISSION_TIMEOUT_MS;
      while (!existsSync(infoFile) && Date.now() < deadline)
        await new Promise((done) => setTimeout(done, 50));
      assert.equal(existsSync(infoFile), true, 'Node pai não registrou os processos');
      const info = JSON.parse(await readFile(infoFile, 'utf8'));
      process.kill(parent.pid, 'SIGKILL');
      assert.equal(
        await waitGone([info.leader, info.descendant, info.supervisor], 8000),
        true,
        'job sobreviveu à morte do Node pai',
      );
    } finally {
      await killTracked([parent.pid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows crash antes do resume não deixa processo suspenso fora do job',
  windowsOnly,
  async () => {
    const session = startWindowsJob(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
      ...baseOptions(),
      testHook: 'crash-before-resume',
    });
    session.on('error', () => {});
    try {
      const ready = await session.ready;
      assert.equal(isAlive(ready.pid), true, 'processo suspenso não foi criado');
      await new Promise((done) => setTimeout(done, 700));
      assert.equal(isAlive(ready.pid), false, 'processo suspenso sobreviveu à morte do supervisor');
      await assert.rejects(session.completion(), (error) => error.stopProven === false);
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
    }
  },
);

test('Windows protocolo quebrado após a admissão não vira sucesso', windowsOnly, async () => {
  const session = startWindowsJob(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
    ...baseOptions(),
    testHook: 'break-protocol-before-resume',
  });
  session.on('error', () => {});
  try {
    await session.ready;
    await assert.rejects(session.completion(), (error) => {
      assert.equal(error.name, 'WindowsJobError');
      assert.equal(error.stage, 'protocol');
      assert.equal(error.stopProven, false);
      return true;
    });
    assert.equal(await waitGone([session.pid, session.supervisorPid], 3000), true);
  } finally {
    await killTracked([session.pid, session.supervisorPid]);
  }
});

test(
  'Windows admissão negada não executa o comando nem inicia fora do job',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-denied-'));
    const marker = join(dir, 'marcador.txt');
    const script = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executou')`;
    const session = startWindowsJob(process.execPath, ['-e', script], {
      ...baseOptions(),
      testHook: 'fail-create-process',
    });
    session.on('error', () => {});
    try {
      await assert.rejects(session.ready, (error) => {
        assert.equal(error.stage, 'create-process');
        assert.equal(error.stopProven, false);
        return true;
      });
      assert.equal(existsSync(marker), false, 'comando iniciou apesar da admissão negada');
      assert.equal(await waitGone([session.pid, session.supervisorPid], 3000), true);
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows job de host restrito impede a execução do filho e prova zero',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-host-'));
    const spacedDir = join(dir, 'fixture host com espacos');
    await mkdir(spacedDir, { recursive: true });
    const readyFile = join(spacedDir, 'ready.txt');
    const resultFile = join(spacedDir, 'result.json');
    const marker = `${resultFile}.marker`;
    const probeFile = join(spacedDir, 'probe.mjs');
    const probeSource = `
      import { existsSync } from 'node:fs';
      import { writeFile } from 'node:fs/promises';
      import { startWindowsJob } from ${JSON.stringify(`file:///${join(root, 'scripts/web-e2e-windows-job.mjs').replaceAll('\\', '/')}`)};
      const [readyFile, resultFile] = process.argv.slice(2);
      const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.includes('=')));
      const marker = resultFile + '.marker';
      const session = startWindowsJob(process.execPath, ['-e', ${JSON.stringify(`require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executou')`)}], {
        cwd: ${JSON.stringify(root)}, env, stopTimeoutMs: 2000, startupTimeoutMs: ${ADMISSION_TIMEOUT_MS}, testHook: 'resume-delay', testDelayMs: 1500,
      });
      session.on('error', () => {});
      const result = { ready: false, entry: process.argv[1], argv: process.argv.slice(2) };
      try {
        result.pid = (await session.ready).pid;
        result.ready = true;
        await writeFile(readyFile, 'ready');
        try {
          result.completion = await session.completion();
        } catch (error) {
          result.completionFailure = {
            name: error.name,
            stage: error.stage,
            stopProven: error.stopProven,
            message: error.message,
          };
        }
        const stopped = await session.stop();
        result.stop = {
          proven: stopped.proven,
          pid: stopped.pid,
          activeProcesses: session._stopped ? session._stopped.activeProcesses : null,
          provenFlag: session._stopped ? session._stopped.proven : null,
        };
      } catch (error) {
        result.stage = error.stage;
        result.stopProven = error.stopProven;
        result.retainLock = error.retainLock;
        result.message = error.message;
      } finally {
        result.marker = existsSync(marker);
        result.leaderAlive = result.pid ? (() => { try { process.kill(result.pid, 0); return true; } catch { return false; } })() : false;
        await writeFile(resultFile, JSON.stringify(result));
      }
    `;
    await writeFile(probeFile, probeSource, 'utf8');
    const host = spawn(
      powershell,
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        join(root, 'scripts/web-e2e-windows-job-host.ps1'),
        '-ProbeScript',
        probeFile,
        '-ReadyFile',
        readyFile,
        '-ResultFile',
        resultFile,
      ],
      { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stderr = '';
    host.stderr.setEncoding('utf8');
    host.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    try {
      const code = await new Promise((done, fail) => {
        host.once('error', fail);
        host.once('close', done);
      });
      assert.equal(code, 0, `host job falhou: ${stderr}`);
      const result = JSON.parse(await readFile(resultFile, 'utf8'));
      assert.equal(result.ready, true);
      assert.equal(result.entry, probeFile);
      assert.deepEqual(result.argv, [readyFile, resultFile]);
      assert.equal(result.completionFailure, undefined);
      // O job de host restrito admite o processo e falha a inicialização do filho;
      // o estágio esperado é STATUS_DLL_INIT_FAILED (0xC0000142), não uma execução bem-sucedida.
      assert.equal(
        result.completion?.code,
        3221225794,
        `código do filho sob job restrito: ${JSON.stringify(result)}`,
      );
      assert.equal(result.completion?.stdout, '');
      assert.equal(result.stop?.proven, true);
      assert.equal(result.stop?.pid, result.pid);
      assert.equal(result.stop?.activeProcesses, 0);
      assert.equal(result.stop?.provenFlag, true);
      assert.equal(result.marker, false, 'filho executou sob job de host restrito');
      assert.equal(result.leaderAlive, false);
    } finally {
      if (isAlive(host.pid)) process.kill(host.pid, 'SIGKILL');
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test('Windows impede breakaway de descendente do job', windowsOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-job-breakaway-'));
  const marker = join(dir, 'escapou.txt');
  const session = startWindowsJob(
    powershell,
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      join(root, 'scripts/web-e2e-windows-breakaway.ps1'),
      '-Marker',
      marker,
      '-NodeExecutable',
      process.execPath,
    ],
    baseOptions(),
  );
  session.on('error', () => {});
  try {
    const result = await session.completion();
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /erro=5/);
    assert.equal(existsSync(marker), false, 'descendente escapou do job por breakaway');
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test(
  'Windows preserva a invocação cmd/bat, o código de saída e não expõe segredo na linha de comando',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-batch-'));
    const batchFile = join(dir, 'com argumentos.cmd');
    const secret = 'segredo-sintetico-123';
    await writeFile(batchFile, '@echo off\r\necho [%*]\r\nexit /b 4\r\n', 'utf8');
    const session = startWindowsJob(
      powershell,
      ['-NoProfile', '-NonInteractive', '-Command', 'Start-Sleep -Milliseconds 1500'],
      baseOptions({ env: inheritedEnvironment({ MUVIT_SEGREDO: secret }) }),
    );
    session.on('error', () => {});
    try {
      await session.ready;
      const commandLine = await new Promise((done, reject) => {
        execFile(
          powershell,
          [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            `(Get-CimInstance Win32_Process -Filter "ProcessId=${session.supervisorPid}").CommandLine`,
          ],
          (error, stdout) => (error ? reject(error) : done(stdout)),
        );
      });
      assert.match(commandLine, /web-e2e-windows-job\.ps1/);
      assert.equal(commandLine.includes(secret), false, 'segredo apareceu na linha de comando');
      const output = await session.completion();
      assert.equal(output.code, 0);
      assert.equal(output.stdout.includes(secret), false);
    } finally {
      await session.stop().catch(() => {});
    }

    const batch = await runAbortableCommand(batchFile, ['x y', 'z'], {
      ...baseOptions(),
      timeoutMs: ADMISSION_TIMEOUT_MS,
      windowsJob: true,
    }).catch((error) => error);
    assert.equal(batch.code, 4);
    assert.equal(batch.stdout, '["x y" "z"]\r\n');
    await assert.rejects(
      runAbortableCommand(batchFile, ['aspas"proibidas'], {
        ...baseOptions(),
        windowsJob: true,
      }),
      /Argumento batch inválido/,
    );
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  },
);

test(
  'Windows falha de PowerShell ou Add-Type vira parada não comprovada sem executar o comando',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-addtype-'));
    const marker = join(dir, 'marcador.txt');
    const script = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executou')`;
    const brokenSupervisor = join(dir, 'supervisor-quebrado.ps1');
    await writeFile(brokenSupervisor, 'throw "Add-Type indisponível"\n', 'utf8');
    try {
      await assert.rejects(
        runAbortableCommand(process.execPath, ['-e', script], {
          ...baseOptions(),
          supervisorScript: brokenSupervisor,
          timeoutMs: 15000,
          windowsJob: true,
        }),
        (error) => {
          assert.equal(error.name, 'StopNotProvenError');
          assert.equal(error.retainLock, true);
          return true;
        },
      );
      assert.equal(existsSync(marker), false);
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows ponte do runner mantém a parada comprovada no término e preserva a linha de comando do Job',
  windowsOnly,
  async () => {
    assert.equal(windowsJobScriptPath.endsWith('web-e2e-windows-job.ps1'), true);
    const commandLine = windowsCommandLine(
      'C:\\Program Files\\node.exe',
      ['', 'a b', 'a"b', 'a\\'],
      {},
    );
    assert.equal(commandLine.startsWith('"C:\\Program Files\\node.exe"'), true);
    const result = await runAbortableCommand(
      process.execPath,
      ['-e', 'process.stdout.write("ok");process.exit(9)'],
      {
        ...baseOptions(),
        timeoutMs: ADMISSION_TIMEOUT_MS,
        windowsJob: true,
      },
    );
    assert.equal(result.stdout, 'ok');
    assert.equal(result.code, 9);
  },
);

function syntheticSupervisorSource() {
  return String.raw`
import { createHmac } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';

const args = process.argv.slice(2);
const mode = args[1];
const supervisorPid = args[2];
const parentPid = args[3];
const parentCreated = args[4];
const markerFile = args[5];
if (markerFile) writeFileSync(markerFile + '.pid', String(process.pid));
const pipeIn = process.env.MUVIT_WEB_E2E_JOB_PIPE_IN;
const pipeOut = process.env.MUVIT_WEB_E2E_JOB_PIPE_OUT;
const token = process.env.MUVIT_WEB_E2E_JOB_TOKEN;
const transcriptFile = markerFile ? markerFile + '.transcript.json' : '';
const frames = [];
const lines = [];
const frameOffsets = new Map();
const lineOffsets = new Map();
function keyOf(pipe, direction) {
  return pipe + ':' + direction;
}
function recordFrame(pipe, direction, data) {
  const key = keyOf(pipe, direction);
  const offset = frameOffsets.get(key) ?? 0;
  const bytes = Buffer.byteLength(data, 'utf8');
  frameOffsets.set(key, offset + bytes);
  frames.push({ sequence: frames.length + 1, pipe, direction, offset, bytes, data });
}
function recordLine(pipe, direction, text) {
  const key = keyOf(pipe, direction);
  const offset = lineOffsets.get(key) ?? 0;
  const bytes = Buffer.byteLength(text, 'utf8') + 1;
  lineOffsets.set(key, offset + bytes);
  lines.push({ sequence: lines.length + 1, pipe, direction, offset, bytes, text, terminated: true });
}
function saveTranscript() {
  if (transcriptFile) writeFileSync(transcriptFile, JSON.stringify({ frames, lines }, null, 2));
}
const delay = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));

function connectPipe(name, options = {}) {
  return new Promise((resolve, reject) => {
    const socket = connect({ path: '\\\\.\\pipe\\' + name, ...options }, () => resolve(socket));
    socket.once('error', reject);
  });
}

const input = await connectPipe(pipeIn, { allowHalfOpen: true });
const output = await connectPipe(pipeOut);
input.on('error', () => {});
output.on('error', () => {});
input.setEncoding('utf8');
let buffer = '';
const queued = [];
const waiters = [];
input.on('data', (chunk) => {
  recordFrame('in', 'read', chunk);
  buffer += chunk;
  for (;;) {
    const index = buffer.indexOf('\n');
    if (index < 0) break;
    const line = buffer.slice(0, index).replace(/\r$/, '');
    buffer = buffer.slice(index + 1);
    recordLine('in', 'read', line);
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else queued.push(line);
  }
});
function nextLine() {
  if (queued.length) return Promise.resolve(queued.shift());
  return new Promise((resolve) => waiters.push(resolve));
}
function writeInputRaw(data) {
  recordFrame('in', 'write', data);
  return new Promise((resolve, reject) => {
    input.write(data, (error) => (error ? reject(error) : resolve()));
  });
}
function writeOutputRaw(data) {
  recordFrame('out', 'write', data);
  return new Promise((resolve, reject) => {
    output.write(data, (error) => (error ? reject(error) : resolve()));
  });
}
function writeInput(line) {
  recordLine('in', 'write', line);
  return writeInputRaw(line + '\n');
}
function writeLine(line) {
  recordLine('out', 'write', line);
  return writeOutputRaw(line + '\n');
}
function endOutput() {
  return new Promise((resolve) => output.end(resolve));
}
function endInput() {
  return new Promise((resolve) => input.end(resolve));
}
function proof(context, nonce) {
  return createHmac('sha256', token).update(context + nonce).digest('base64url');
}

const challenge = await nextLine();
const challengeFields = challenge.split(' ');
const hasEventAuth = challengeFields.length === 3;
const inputProof = proof('muvit-job-auth:', challengeFields[1]);
const eventProof = hasEventAuth ? proof('muvit-job-events:', challengeFields[2]) : '';

if (mode === 'no-input-auth') {
  await delay(300);
  saveTranscript();
  await delay(10000);
  process.exit(0);
}

recordLine('in', 'write', 'auth ' + inputProof);
await writeInputRaw('auth ' + inputProof.slice(0, 12));
await writeInputRaw(inputProof.slice(12) + '\n');

if (mode === 'input-duplicate-after-auth') {
  saveTranscript();
  await writeInputRaw('duplicado-no-canal-de-entrada\n');
  await delay(300);
  saveTranscript();
  process.exit(0);
}

if (mode === 'event-auth-missing') {
  saveTranscript();
  await writeLine('ready 1 ' + process.pid + ' ' + parentPid + ' ' + parentCreated + ' ' + supervisorPid);
  await delay(300);
  saveTranscript();
  await delay(500);
  process.exit(0);
}
if (mode === 'event-auth-wrong-context') {
  await writeLine('auth ' + inputProof);
  saveTranscript();
  await writeLine('ready 1 ' + process.pid + ' ' + parentPid + ' ' + parentCreated + ' ' + supervisorPid);
  await delay(300);
  saveTranscript();
  await delay(500);
  process.exit(0);
}
if (mode === 'event-auth-bad-proof') {
  await writeLine('auth ' + 'A'.repeat(43));
  saveTranscript();
  await writeLine('ready 1 ' + process.pid + ' ' + parentPid + ' ' + parentCreated + ' ' + supervisorPid);
  await delay(300);
  saveTranscript();
  await delay(500);
  process.exit(0);
}

if (hasEventAuth) {
  recordLine('out', 'write', 'auth ' + eventProof);
  await writeOutputRaw('auth ' + eventProof.slice(0, 10));
  await writeOutputRaw(eventProof.slice(10) + '\n');
}
for (;;) {
  const line = await nextLine();
  if (line === 'end') break;
}
await writeLine('ready 1 ' + process.pid + ' ' + parentPid + ' ' + parentCreated + ' ' + supervisorPid);
const resume = await nextLine();
if (resume !== 'resume') throw new Error('resume inesperado: ' + resume);
if (mode === 'settlement-hang' || mode === 'settlement-late-stopped' || mode === 'settlement-late-leader') {
  if (mode === 'settlement-late-leader') {
    const leaderBarrier = markerFile + '.allow-leader';
    const leaderDeadline = Date.now() + 15000;
    while (!existsSync(leaderBarrier) && Date.now() < leaderDeadline) await delay(50);
    await writeLine('leader-exit 2 0');
    writeFileSync(markerFile, 'leader-exit');
    try {
      await writeLine('stopped 3 0 1 1');
      writeFileSync(markerFile + '.stopped-emitted', 'emitido');
    } catch (error) {
      writeFileSync(markerFile + '.stopped-failed', String(error?.code ?? error));
    }
    try {
      await endOutput();
    } catch {}
    try {
      await endInput();
    } catch {}
    saveTranscript();
    process.exit(0);
  }
  await writeLine('leader-exit 2 0');
  writeFileSync(markerFile, 'leader-exit');
  if (mode === 'settlement-hang') {
    await delay(7000);
    saveTranscript();
    process.exit(0);
  }
  const barrierFile = markerFile + '.allow-stopped';
  const deadline = Date.now() + 15000;
  while (!existsSync(barrierFile) && Date.now() < deadline) await delay(50);
  writeFileSync(markerFile + '.stopped-attempt', 'tentativa');
  try {
    await writeLine('stopped 3 0 1 1');
    writeFileSync(markerFile + '.stopped-emitted', 'emitido');
  } catch (error) {
    writeFileSync(markerFile + '.stopped-failed', String(error?.code ?? error));
  }
  try {
    await endOutput();
  } catch {}
  try {
    await endInput();
  } catch {}
  saveTranscript();
  process.exit(0);
}
if (mode === 'closed-output-stopped') {
  await writeLine('leader-exit 2 0');
  await endOutput();
  writeFileSync(markerFile + '.stopped-attempt', 'tentativa');
  try {
    await writeLine('stopped 3 0 1 1');
    writeFileSync(markerFile + '.stopped-emitted', 'emitido');
  } catch (error) {
    writeFileSync(markerFile + '.stopped-failed', String(error?.code ?? error));
  }
  saveTranscript();
  process.exit(0);
}
await writeLine('leader-exit 2 0');
await writeLine('stopped 3 0 1 1');
if (mode === 'duplicate-after-terminal') {
  writeFileSync(markerFile, 'terminal');
  await delay(500);
  await writeLine('stopped 4 0 1 1');
  await endOutput();
} else if (mode === 'terminal-before-control-eof') {
  writeFileSync(markerFile, 'terminal');
  await delay(1200);
  await endOutput();
} else if (mode === 'terminal-before-supervisor-exit') {
  writeFileSync(markerFile, 'terminal');
  await endOutput();
} else if (mode === 'input-hold-after-terminal') {
  writeFileSync(markerFile, 'terminal');
  await endOutput();
  await delay(1200);
  await endInput();
} else if (mode === 'input-trailing-fragment') {
  writeFileSync(markerFile, 'terminal');
  await writeInputRaw('fragmento-sem-newline');
  await endOutput();
  await delay(500);
  await endInput();
} else if (mode === 'trailing-fragment-after-stopped') {
  await delay(50);
  recordFrame('out', 'write', 'stopped 4 0 1 1');
  output.write('stopped 4 0 1 1');
  await delay(50);
  await endOutput();
} else if (mode === 'terminal-before-stdio-eof') {
  await delay(1200);
  await endOutput();
} else {
  await endOutput();
}
saveTranscript();
process.exit(0);
`;
}

async function writeSyntheticSupervisor(dir, mode) {
  const fixtureDir = join(dir, 'supervisor sintetico com espacos');
  await mkdir(fixtureDir, { recursive: true });
  const scriptPath = join(fixtureDir, 'supervisor-sintetico.mjs');
  const launcher = join(fixtureDir, 'supervisor-sintetico.ps1');
  const marker = join(fixtureDir, `marcador-${mode}.txt`);
  const escapePowerShell = (value) => value.replaceAll("'", "''");
  await writeFile(scriptPath, syntheticSupervisorSource(), 'utf8');
  const source = `param()
$ErrorActionPreference = 'Stop'
${powerShellArgumentHelper}
$node = '${escapePowerShell(process.execPath)}'
$script = '${escapePowerShell(scriptPath)}'
$parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId=$PID").ParentProcessId
$parent = Get-Process -Id $parentPid
$parentCreated = [long]($parent.StartTime.ToUniversalTime().Ticks - 504911232000000000)
$mode = '${escapePowerShell(mode)}'
$marker = '${escapePowerShell(marker)}'
if ($mode -eq 'exit-before-events' -or $mode -eq 'terminal-before-control-eof' -or $mode -eq 'duplicate-after-terminal' -or $mode -eq 'terminal-before-supervisor-exit' -or $mode -eq 'input-hold-after-terminal' -or $mode -eq 'input-trailing-fragment' -or $mode -eq 'settlement-hang' -or $mode -eq 'settlement-late-stopped' -or $mode -eq 'settlement-late-leader') {
  $writerArguments = Join-MuvitProcessArguments @($script, 'writer', $mode, "$PID", "$parentPid", "$parentCreated", $marker)
  $writer = Start-Process -FilePath $node -ArgumentList $writerArguments -PassThru -RedirectStandardOutput ($marker + '.out') -RedirectStandardError ($marker + '.err')
  [System.IO.File]::WriteAllText($marker + '.pid', [string]$writer.Id, (New-Object System.Text.UTF8Encoding($false)))
  if ($mode -eq 'exit-before-events') { exit 0 }
  $deadline = (Get-Date).AddSeconds(10)
  while (-not (Test-Path $marker) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 50 }
  if (-not (Test-Path $marker)) { exit 6 }
  if ($mode -eq 'terminal-before-supervisor-exit') {
    $exitFile = $marker + '.exit'
    while (-not (Test-Path $exitFile) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 50 }
    if (-not (Test-Path $exitFile)) { exit 7 }
  }
  exit 0
}
& $node $script 'inline' $mode "$PID" "$parentPid" "$parentCreated" $marker
exit $LASTEXITCODE
`;
  await writeFile(launcher, source, 'utf8');
  return { launcher, marker };
}

async function syntheticWriterPid(marker) {
  const pidFile = `${marker}.pid`;
  const deadline = Date.now() + 2000;
  while (!existsSync(pidFile) && Date.now() < deadline) await delay(50);
  return existsSync(pidFile) ? Number(await readFile(pidFile, 'utf8')) : 0;
}

test(
  'Windows não entrega configuração nem ambiente sem a prova HMAC de entrada',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-auth-'));
    const { launcher, marker } = await writeSyntheticSupervisor(dir, 'no-input-auth');
    const transcriptFile = `${marker}.transcript.json`;
    const secret = 'segredo-antes-do-handshake-987';
    const session = startWindowsJob(process.execPath, ['-e', writeMarkerScript(marker)], {
      ...baseOptions(),
      env: inheritedEnvironment({ MUVIT_SEGREDO_AUTH: secret }),
      supervisorScript: launcher,
      authTimeoutMs: 3000,
      startupTimeoutMs: ADMISSION_TIMEOUT_MS,
    });
    session.on('error', () => {});
    try {
      await assert.rejects(session.ready, (error) => {
        assert.equal(error.name, 'WindowsJobStopError');
        assert.equal(error.stage, 'control-auth');
        assert.equal(error.stopProven, false);
        assert.equal(error.retainLock, true);
        return true;
      });
      assert.equal(existsSync(transcriptFile), true, 'transcript completa não foi capturada');
      const { frames, lines } = JSON.parse(await readFile(transcriptFile, 'utf8'));
      assert.match(lines[0].text, /^challenge [A-Za-z0-9_-]+ [A-Za-z0-9_-]+$/);
      assert.equal(
        lines.length,
        1,
        'supervisor não autenticado recebeu escrita no canal de entrada',
      );
      assert.equal(
        frames.some((frame) => frame.direction === 'write'),
        false,
        'supervisor não autenticado escreveu no canal',
      );
      assert.equal(
        lines.some((line) => isConfigLine(line.text)),
        false,
        'configuração foi enfileirada antes da prova HMAC',
      );
      assert.equal(
        lines.some((line) => line.text.includes(secret)),
        false,
      );
      assert.equal(existsSync(marker), false, 'comando executou sem handshake');
      await assert.rejects(session.completion(), (error) => error.stopProven === false);
      assert.equal(await waitGone([session.supervisorPid], 5000), true);
    } finally {
      await killTracked([session.supervisorPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows autentica os dois transportes e captura a ordem completa antes e depois da prova',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-auth-input-'));
    const { launcher, marker } = await writeSyntheticSupervisor(dir, 'transcript');
    const transcriptFile = `${marker}.transcript.json`;
    const secret = 'segredo-somente-apos-auth-321';
    const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
      ...baseOptions(),
      env: inheritedEnvironment({ MUVIT_SEGREDO_AUTH: secret }),
      supervisorScript: launcher,
      authTimeoutMs: 3000,
      startupTimeoutMs: ADMISSION_TIMEOUT_MS,
    });
    session.on('error', () => {});
    try {
      const result = await session.completion();
      assert.equal(result.code, 0);
      const transcript = JSON.parse(await readFile(transcriptFile, 'utf8'));
      const { frames, lines } = transcriptOf(transcript);
      const order = assertAuthTranscriptOrder(transcript);
      assert.equal(lines[order.firstConfig].text.startsWith('app '), true);
      const eventAuthFrames = frames.filter(
        (frame) =>
          frame.pipe === 'out' &&
          frame.direction === 'write' &&
          frame.sequence >= 3 &&
          frame.data.startsWith('auth '),
      );
      assert.ok(eventAuthFrames.length >= 1, 'prova de saída não registrada no framing');
      assert.ok(
        frames.some(
          (frame) =>
            frame.pipe === 'out' &&
            frame.direction === 'write' &&
            !frame.data.endsWith('\n') &&
            frame.sequence < order.firstEvent,
        ),
        'framing não preservou o fragmento da prova de saída',
      );
      const envLine = lines.find(
        (line) =>
          line.pipe === 'in' &&
          line.direction === 'read' &&
          line.text.startsWith('env ') &&
          Buffer.from(line.text.split(' ')[1], 'base64').toString('utf8') === 'MUVIT_SEGREDO_AUTH',
      );
      assert.ok(envLine, 'ambiente não entregue após a autenticação');
      const [, key, value] = envLine.text.split(' ');
      assert.equal(Buffer.from(key, 'base64').toString('utf8'), 'MUVIT_SEGREDO_AUTH');
      assert.equal(Buffer.from(value, 'base64').toString('utf8'), secret);
      assert.equal(
        lines.some((line) => line.text.includes(secret)),
        false,
        'segredo apareceu em claro na transcrição',
      );
      const forged = {
        frames: frames.map((frame) => ({ ...frame })),
        lines: lines.map((line) => ({ ...line })),
      };
      const configIndex = forged.lines.findIndex(
        (line) => line.pipe === 'in' && line.direction === 'read' && line.text.startsWith('app '),
      );
      const [config] = forged.lines.splice(configIndex, 1);
      forged.lines.splice(
        forged.lines.findIndex(
          (line) =>
            line.pipe === 'in' && line.direction === 'write' && line.text.startsWith('auth '),
        ),
        0,
        config,
      );
      assert.throws(
        () => assertAuthTranscriptOrder(forged, { framing: false }),
        /configuração enfileirada antes das provas HMAC/,
        'transcript não detectou configuração antes da prova',
      );
      const beforeEventAuth = {
        frames: frames.map((frame) => ({ ...frame })),
        lines: lines.map((line) => ({ ...line })),
      };
      const moved = beforeEventAuth.lines.splice(
        beforeEventAuth.lines.findIndex(
          (line) => line.pipe === 'in' && line.direction === 'read' && line.text.startsWith('cmd '),
        ),
        1,
      )[0];
      beforeEventAuth.lines.splice(order.eventAuth, 0, moved);
      assert.throws(
        () => assertAuthTranscriptOrder(beforeEventAuth, { framing: false }),
        /configuração enfileirada antes das provas HMAC/,
        'transcript não detectou configuração antes da prova de saída',
      );
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test('Windows recusa ready sem prova HMAC no canal de eventos', windowsOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-job-auth-events-'));
  try {
    for (const mode of ['event-auth-missing', 'event-auth-wrong-context', 'event-auth-bad-proof']) {
      const { launcher, marker } = await writeSyntheticSupervisor(dir, mode);
      const transcriptFile = `${marker}.transcript.json`;
      const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
        ...baseOptions(),
        supervisorScript: launcher,
        authTimeoutMs: 3000,
        startupTimeoutMs: ADMISSION_TIMEOUT_MS,
      });
      session.on('error', () => {});
      try {
        await assert.rejects(session.ready, (error) => {
          assert.equal(error.stage, 'control-auth', `${mode}: ${error.message}`);
          assert.equal(error.stopProven, false);
          return true;
        });
        await assert.rejects(session.completion(), (error) => error.stage === 'control-auth');
        assert.equal(session._receivedReady, false, `${mode}: ready não autenticado foi aceito`);
        assert.equal(session.pid, 0, `${mode}: evento forjado entregou o líder`);
        assert.equal(existsSync(transcriptFile), true, `${mode}: transcript não foi salva`);
        const { lines } = JSON.parse(await readFile(transcriptFile, 'utf8'));
        assert.equal(
          lines.some((line) => isConfigLine(line.text)),
          false,
          `${mode}: configuração enviada sem a prova HMAC do canal de eventos`,
        );
        assert.equal(
          lines.some(
            (line) =>
              line.pipe === 'in' && line.direction === 'read' && line.text.startsWith('app '),
          ),
          false,
          `${mode}: app enviado antes da prova de eventos`,
        );
      } finally {
        await killTracked([session.supervisorPid]);
        await delay(100);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test(
  'Windows rejeita sufixo sem newline no EOF do controle depois do stopped válido',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-order-fragment-'));
    const { launcher } = await writeSyntheticSupervisor(dir, 'trailing-fragment-after-stopped');
    const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
      ...baseOptions(),
      supervisorScript: launcher,
      startupTimeoutMs: ADMISSION_TIMEOUT_MS,
    });
    session.on('error', () => {});
    try {
      const outcome = await Promise.race([
        session.completion().then(
          (value) => ({ value }),
          (error) => ({ error }),
        ),
        delay(ADMISSION_TIMEOUT_MS).then(() => ({ timeout: true })),
      ]);
      assert.equal(outcome.timeout, undefined, 'completion pendurou após o sufixo');
      assert.ok(
        outcome.error,
        `completion concluiu com sucesso após sufixo sem newline: ${JSON.stringify(outcome.value)}`,
      );
      assert.equal(outcome.error.stage, 'protocol');
      assert.match(outcome.error.message, /sufixo sem newline/);
      assert.equal(outcome.error.stopProven, false);
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test('Windows rejeita duplicata no canal de entrada após a autenticação', windowsOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-job-input-duplicate-'));
  const { launcher } = await writeSyntheticSupervisor(dir, 'input-duplicate-after-auth');
  const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
    ...baseOptions(),
    supervisorScript: launcher,
    startupTimeoutMs: ADMISSION_TIMEOUT_MS,
  });
  session.on('error', () => {});
  try {
    const outcome = await Promise.race([
      session.ready.then(
        () => ({ ready: true }),
        (error) => ({ error }),
      ),
      delay(ADMISSION_TIMEOUT_MS).then(() => ({ timeout: true })),
    ]);
    assert.ok(outcome.error, `ready aceitou dados duplicados: ${JSON.stringify(outcome)}`);
    assert.equal(outcome.error.stage, 'protocol');
    assert.equal(outcome.error.stopProven, false);
    await assert.rejects(session.completion(), (error) => error.stage === 'protocol');
    assert.equal(session._receivedReady, false);
  } finally {
    await killTracked([session.pid, session.supervisorPid]);
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test('Windows rejeita sufixo sem newline no EOF do canal de entrada', windowsOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-job-input-fragment-'));
  const { launcher, marker } = await writeSyntheticSupervisor(dir, 'input-trailing-fragment');
  const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
    ...baseOptions(),
    supervisorScript: launcher,
    startupTimeoutMs: ADMISSION_TIMEOUT_MS,
  });
  session.on('error', () => {});
  try {
    await session.ready;
    const outcome = await Promise.race([
      session.completion().then(
        (value) => ({ value }),
        (error) => ({ error }),
      ),
      delay(10000).then(() => ({ timeout: true })),
    ]);
    assert.equal(outcome.timeout, undefined, 'completion pendurou após o sufixo de entrada');
    assert.ok(
      outcome.error,
      `completion concluiu com sucesso após sufixo sem newline na entrada: ${JSON.stringify(outcome.value)}`,
    );
    assert.equal(outcome.error.stage, 'protocol');
    assert.match(outcome.error.message, /sufixo sem newline/);
    assert.equal(outcome.error.stopProven, false);
  } finally {
    const writerPid = await syntheticWriterPid(marker);
    await killTracked([session.pid, session.supervisorPid, writerPid]);
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test('Windows não fecha a liquidação antes do EOF do canal de entrada', windowsOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-job-input-gate-'));
  const { launcher } = await writeSyntheticSupervisor(dir, 'terminal-before-control-eof');
  const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
    ...baseOptions(),
    supervisorScript: launcher,
    startupTimeoutMs: ADMISSION_TIMEOUT_MS,
    testHook: 'hold-control-after-leader-exit',
  });
  session.on('error', () => {});
  try {
    await session.ready;
    assert.equal(await waitFor(() => session._stopped !== null, 5000), true);
    session._controlEnded = true;
    session._stdoutEnded = true;
    session._stderrEnded = true;
    session._supervisorExited = true;
    session._maybeClose();
    assert.equal(session._inputEnded, false, 'EOF de entrada foi assumido sem evento');
    assert.equal(session._closed, false, 'liquidação fechou sem EOF do canal de entrada');
    session._onInputEnd();
    assert.equal(session._closed, true, 'liquidação não fechou após o EOF de entrada');
  } finally {
    await killTracked([session.pid, session.supervisorPid]);
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test('Windows não conclui a liquidação antes do EOF do canal de entrada', windowsOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-job-input-eof-'));
  const { launcher, marker } = await writeSyntheticSupervisor(dir, 'input-hold-after-terminal');
  const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
    ...baseOptions(),
    supervisorScript: launcher,
    startupTimeoutMs: ADMISSION_TIMEOUT_MS,
    testHook: 'hold-control-after-leader-exit',
  });
  session.on('error', () => {});
  try {
    await session.ready;
    const early = await Promise.race([
      session.completion().then(
        () => 'resolved',
        (error) => error,
      ),
      delay(700).then(() => 'pending'),
    ]);
    assert.equal(early, 'pending', 'completion concluiu antes do EOF de entrada');
    const result = await session.completion();
    assert.deepEqual(result, { code: 0, stdout: '', stderr: '' });
  } finally {
    const writerPid = await syntheticWriterPid(marker);
    await killTracked([session.pid, session.supervisorPid, writerPid]);
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test('Windows não ignora erros de transporte após o stopped', windowsOnly, async () => {
  for (const channel of ['input', 'control']) {
    const dir = await mkdtemp(join(tmpdir(), `muvit-job-transport-${channel}-`));
    const { launcher } = await writeSyntheticSupervisor(dir, 'terminal-before-control-eof');
    const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
      ...baseOptions(),
      supervisorScript: launcher,
      startupTimeoutMs: ADMISSION_TIMEOUT_MS,
      testHook: 'hold-control-after-leader-exit',
    });
    session.on('error', () => {});
    try {
      await session.ready;
      assert.equal(await waitFor(() => session._stopped !== null, 5000), true);
      const target = channel === 'input' ? session._socket : session._eventSocket;
      target.destroy(new Error(`falha de transporte de ${channel}`));
      const outcome = await Promise.race([
        session.completion().then(
          (value) => ({ value }),
          (error) => ({ error }),
        ),
        delay(3000).then(() => ({ timeout: true })),
      ]);
      assert.equal(outcome.timeout, undefined, `${channel}: completion pendurou`);
      assert.ok(
        outcome.error,
        `${channel}: erro de transporte após stopped virou sucesso: ${JSON.stringify(outcome.value)}`,
      );
      assert.equal(outcome.error.stage, channel === 'input' ? 'input-error' : 'control-error');
      assert.equal(outcome.error.stopProven, false);
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }
});

test(
  'Windows expira a liquidação após leader-exit sem stopped/EOF em janela limitada',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-settlement-hang-'));
    const { launcher, marker } = await writeSyntheticSupervisor(dir, 'settlement-hang');
    const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
      ...baseOptions(),
      supervisorScript: launcher,
      startupTimeoutMs: ADMISSION_TIMEOUT_MS,
    });
    session.on('error', () => {});
    const started = Date.now();
    try {
      await session.ready;
      const outcome = await Promise.race([
        session.completion().then(
          (value) => ({ value }),
          (error) => ({ error }),
        ),
        delay(9000).then(() => ({ timeout: true })),
      ]);
      assert.equal(outcome.timeout, undefined, 'liquidação sem stopped/EOF não expirou');
      assert.ok(
        outcome.error,
        `completion concluiu sem stopped/EOF: ${JSON.stringify(outcome.value)}`,
      );
      assert.equal(outcome.error.name, 'WindowsJobStopError');
      assert.equal(outcome.error.stage, 'settlement-timeout');
      assert.equal(outcome.error.stopProven, false);
      assert.equal(outcome.error.retainLock, true);
      assert.ok(Date.now() - started >= 4500, 'janela de liquidação não cobriu 5s');
    } finally {
      const writerPid = await syntheticWriterPid(marker);
      await killTracked([session.pid, session.supervisorPid, writerPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows rejeita evidência terminal depois do prazo mesmo sem o callback do timer',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-settlement-deadline-'));
    const { launcher, marker } = await writeSyntheticSupervisor(dir, 'settlement-late-stopped');
    const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
      ...baseOptions(),
      supervisorScript: launcher,
      startupTimeoutMs: ADMISSION_TIMEOUT_MS,
      settlementTimeoutMs: 30000,
    });
    session.on('error', () => {});
    try {
      await session.ready;
      assert.equal(
        await waitFor(() => session._receivedLeaderExit, 5000),
        true,
        'leader-exit não chegou',
      );
      // Simula I/O processado depois do prazo com o callback do timer ainda pendente.
      session._settlementDeadline = performance.now() - 1;
      await writeFile(`${marker}.allow-stopped`, 'liberar', 'utf8');
      const outcome = await Promise.race([
        session.completion().then(
          (value) => ({ value }),
          (error) => ({ error }),
        ),
        delay(10000).then(() => ({ timeout: true })),
      ]);
      assert.equal(outcome.timeout, undefined, 'completion pendurou após o prazo');
      assert.ok(
        outcome.error,
        `evidência terminal tardia virou sucesso: ${JSON.stringify(outcome.value)}`,
      );
      assert.equal(outcome.error.name, 'WindowsJobStopError');
      assert.equal(outcome.error.stage, 'settlement-timeout');
      assert.equal(outcome.error.stopProven, false);
      assert.equal(outcome.error.retainLock, true);
    } finally {
      const writerPid = await syntheticWriterPid(marker);
      await killTracked([session.pid, session.supervisorPid, writerPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows não prorroga o deadline do stop com leader-exit tardio e preserva o lock',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-settlement-stop-deadline-'));
    const { launcher, marker } = await writeSyntheticSupervisor(dir, 'settlement-late-leader');
    const lockFile = join(dir, 'next-env.lock');
    const retained = [];
    let session;
    try {
      const failure = await runWithNextEnvLock(
        {
          lockFile,
          runId: 'cccc33',
          timeoutMs: 5000,
          onRetained: (error) => retained.push(error),
        },
        async () => {
          session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
            ...baseOptions(),
            supervisorScript: launcher,
            startupTimeoutMs: ADMISSION_TIMEOUT_MS,
            settlementTimeoutMs: 30000,
          });
          session.on('error', () => {});
          await session.ready;
          // Isola o leader-exit tardio do EOF de entrada que o half-close do
          // stop produziria antes do evento; o prazo é o mesmo do stop real.
          const originalSocketEnd = session._socket.end;
          session._socket.end = function endWithoutEof(chunk) {
            if (chunk) this.write(chunk);
            return this;
          };
          let stopPromise;
          try {
            stopPromise = session.stop({ timeoutMs: 2000 }).catch((error) => error);
          } finally {
            session._socket.end = originalSocketEnd;
          }
          const deadlineAtStopStart = session._settlementDeadline;
          // Avança o relógio monotônico além do prazo do stop sem executar o
          // callback do timer: a evidência terminal chega com o prazo vencido.
          const realPerformanceNow = performance.now.bind(performance);
          performance.now = () => realPerformanceNow() + 10000;
          try {
            await writeFile(`${marker}.allow-leader`, 'liberar', 'utf8');
            const stopError = await stopPromise;
            const completionError = await session.completion().catch((error) => error);
            assert.equal(
              stopError?.stage,
              'settlement-timeout',
              `stop aceitou evidência terminal depois do prazo: ${JSON.stringify({
                message: stopError?.message,
                receivedLeaderExit: session._receivedLeaderExit,
                transcript: existsSync(`${marker}.transcript.json`),
              })}`,
            );
            assert.equal(
              completionError?.stage,
              'settlement-timeout',
              `completion aceitou evidência terminal depois do prazo: ${JSON.stringify(completionError)}`,
            );
            assert.equal(stopError.stopProven, false);
            assert.equal(stopError.retainLock, true);
            assert.notEqual(deadlineAtStopStart, null, 'stop não armou o deadline único');
            throw stopError;
          } finally {
            performance.now = realPerformanceNow;
          }
        },
      ).catch((error) => error);
      assert.equal(
        failure.name,
        'WindowsJobStopError',
        `falha inesperada: ${failure.name}: ${failure.message}`,
      );
      assert.equal(failure.stage, 'settlement-timeout');
      assert.equal(retained.length, 1);
      const record = JSON.parse(await readFile(lockFile, 'utf8'));
      assert.equal(record.runId, 'cccc33');
    } finally {
      const writerPid = await syntheticWriterPid(marker);
      await killTracked([session?.pid, session?.supervisorPid, writerPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows liquidação tardia via runner preserva o lock e o runId após erro e tentativa no pipe fechado',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-settlement-lock-'));
    const { launcher, marker } = await writeSyntheticSupervisor(dir, 'settlement-late-stopped');
    const lockFile = join(dir, 'next-env.lock');
    const retained = [];
    try {
      const failure = await runWithNextEnvLock(
        {
          lockFile,
          runId: 'bbbb22',
          timeoutMs: 5000,
          onRetained: (error) => retained.push(error),
        },
        async () =>
          runAbortableCommand(process.execPath, ['-e', 'process.exit(0)'], {
            ...baseOptions(),
            supervisorScript: launcher,
            startupTimeoutMs: ADMISSION_TIMEOUT_MS,
            stopTimeoutMs: 400,
            timeoutMs: ADMISSION_TIMEOUT_MS,
            windowsJob: true,
          }),
      ).catch((error) => error);
      assert.equal(
        failure.name,
        'StopNotProvenError',
        `falha inesperada: ${failure.name}: ${failure.message}`,
      );
      assert.equal(failure.stopProven, false);
      assert.equal(failure.retainLock, true);
      assert.equal(failure.cause?.stage, 'settlement-timeout');
      assert.equal(retained.length, 1);
      let record = JSON.parse(await readFile(lockFile, 'utf8'));
      assert.equal(record.runId, 'bbbb22');
      assert.equal(record.pid, process.pid);
      await writeFile(`${marker}.allow-stopped`, 'liberar', 'utf8');
      assert.equal(
        await waitFor(() => existsSync(`${marker}.stopped-attempt`), 15000),
        true,
        'writer não sinalizou a tentativa de emitir stopped tardio',
      );
      assert.equal(
        await waitFor(() => existsSync(`${marker}.stopped-failed`), 15000),
        true,
        'escrita do stopped tardio não falhou com o pipe fechado',
      );
      assert.equal(
        existsSync(`${marker}.stopped-emitted`),
        false,
        'stopped tardio foi marcado como entregue apesar do pipe fechado',
      );
      assert.equal(
        await waitFor(() => existsSync(`${marker}.transcript.json`), 15000),
        true,
        'transcript do writer tardio não foi gravado',
      );
      assert.equal(existsSync(lockFile), true, 'lock foi removido após a tentativa tardia');
      record = JSON.parse(await readFile(lockFile, 'utf8'));
      assert.equal(record.runId, 'bbbb22');
    } finally {
      const writerPid = await syntheticWriterPid(marker);
      await killTracked([writerPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows writer sintético propaga erro de pipe fechado e não marca entrega',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-writer-error-'));
    const { launcher, marker } = await writeSyntheticSupervisor(dir, 'closed-output-stopped');
    const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
      ...baseOptions(),
      supervisorScript: launcher,
      startupTimeoutMs: ADMISSION_TIMEOUT_MS,
    });
    session.on('error', () => {});
    try {
      await session.ready;
      const outcome = await Promise.race([
        session.completion().then(
          (value) => ({ value }),
          (error) => ({ error }),
        ),
        delay(10000).then(() => ({ timeout: true })),
      ]);
      assert.equal(outcome.timeout, undefined, 'completion pendurou após o EOF sem stopped');
      assert.ok(outcome.error, `EOF sem stopped virou sucesso: ${JSON.stringify(outcome.value)}`);
      assert.equal(outcome.error.stage, 'control-eof');
      assert.equal(
        await waitFor(() => existsSync(`${marker}.stopped-attempt`), 15000),
        true,
        'writer não registrou a tentativa de escrita',
      );
      assert.equal(
        await waitFor(() => existsSync(`${marker}.stopped-failed`), 15000),
        true,
        'writer não propagou o erro do pipe fechado',
      );
      assert.equal(
        existsSync(`${marker}.stopped-emitted`),
        false,
        'escrita com erro foi marcada como entregue',
      );
    } finally {
      const writerPid = await syntheticWriterPid(marker);
      await killTracked([session.pid, session.supervisorPid, writerPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows falha pré-pipes preserva diagnóstico sanitizado sem admission-timeout',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-startup-log-'));
    const brokenSupervisor = join(dir, 'supervisor-diagnostico.ps1');
    await writeFile(
      brokenSupervisor,
      [
        "[Console]::Error.WriteLine('diagnostico inofensivo: Add-Type falhou no teste')",
        "[Console]::Error.WriteLine('MUVIT_WEB_E2E_JOB_TOKEN=' + $env:MUVIT_WEB_E2E_JOB_TOKEN)",
        "[Console]::Error.WriteLine('MUVIT_WEB_E2E_JOB_PIPE_IN=' + $env:MUVIT_WEB_E2E_JOB_PIPE_IN)",
        'exit 3',
        '',
      ].join('\n'),
      'utf8',
    );
    const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
      ...baseOptions(),
      supervisorScript: brokenSupervisor,
      startupTimeoutMs: ADMISSION_TIMEOUT_MS,
    });
    session.on('error', () => {});
    const started = Date.now();
    try {
      const error = await session.ready.catch((failure) => failure);
      const elapsed = Date.now() - started;
      assert.equal(error.name, 'WindowsJobError');
      assert.equal(error.stage, 'supervisor-startup');
      assert.match(error.message, /diagnostico inofensivo: Add-Type falhou no teste/);
      assert.equal(error.message.includes('MUVIT_WEB_E2E_JOB_'), false, 'mensagem expôs ambiente');
      assert.equal(error.message.includes(session._token), false, 'mensagem expôs o token');
      assert.ok(elapsed < 5000, `falha pre-pipes levou ${elapsed}ms e virou admission-timeout`);
      const diagnostic = session.diagnosticOutput();
      assert.match(diagnostic, /diagnostico inofensivo: Add-Type falhou no teste/);
      assert.equal(diagnostic.includes('MUVIT_WEB_E2E_JOB_'), false, 'diagnóstico expôs ambiente');
      assert.equal(diagnostic.includes(session._token), false, 'diagnóstico expôs o token');
      await assert.rejects(session.completion(), (failure) => failure.stopProven === false);
    } finally {
      await killTracked([session.supervisorPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows parser de controle real aceita sequência válida e prova ActiveProcesses=0',
  windowsOnly,
  async () => {
    const session = startWindowsJob(
      process.execPath,
      ['-e', 'process.stdin.resume();setInterval(()=>{},1000)'],
      {
        ...baseOptions(),
        testHook: 'skip-node-resume',
      },
    );
    session.on('error', () => {});
    try {
      await session.ready;
      const stdin = Buffer.from('linha válida', 'utf8').toString('base64');
      session._socket.write('resume\n');
      session._socket.write(`stdin ${stdin}\n`);
      session._socket.write('stdin-eof\n');
      const stopped = await session.stop({ timeoutMs: 5000 });
      assert.deepEqual(stopped, { proven: true, pid: session.pid });
      assert.equal(session.resumedLeader, true);
      assert.equal(session._stopped.activeProcesses, 0);
      assert.equal(session._stopped.proven, true);
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
    }
  },
);

test(
  'Windows parser real drena stdin válido já enviado durante leader-exit natural',
  windowsOnly,
  async () => {
    const session = startWindowsJob(
      process.execPath,
      ['-e', 'setTimeout(()=>process.exit(0),100)'],
      {
        ...baseOptions(),
        testHook: 'suspend-reader',
        testDelayMs: 800,
        startupTimeoutMs: ADMISSION_TIMEOUT_MS,
      },
    );
    session.on('error', () => {});
    try {
      await session.ready;
      const stdin = Buffer.from('linha válida após resume', 'utf8').toString('base64');
      session._socket.write(`stdin ${stdin}\n`);
      session._socket.write('stdin-eof\n');
      const result = await session.completion();
      assert.equal(result.code, 0);
      assert.equal(session.resumedLeader, true);
      assert.equal(session._stopped.activeProcesses, 0);
      assert.equal(
        session._stopped.proven,
        true,
        'frames válidos já enviados foram rejeitados após o leader-exit natural',
      );
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
    }
  },
);

test(
  'Windows parser de controle real invalida protocolBroken e não prova zero',
  windowsOnly,
  async () => {
    const cases = [
      { name: 'resume duplicado', lines: ['resume', 'resume', 'stop'] },
      { name: 'comando inválido', lines: ['resume', 'comando-invalido', 'stop'] },
      { name: 'EOF duplicado', lines: ['resume', 'stdin-eof', 'stdin-eof', 'stop'] },
      {
        name: 'stdin depois do EOF',
        lines: ['resume', 'stdin-eof', `stdin ${Buffer.from('x').toString('base64')}`, 'stop'],
      },
      {
        name: 'stdin antes do resume',
        lines: [`stdin ${Buffer.from('x').toString('base64')}`, 'stop'],
      },
      { name: 'Base64 inválido', lines: ['resume', 'stdin ***', 'stop'] },
      { name: 'comando sem newline', lines: ['resume'], raw: 'stdin-eof', endInput: true },
    ];
    for (const scenario of cases) {
      const session = startWindowsJob(
        process.execPath,
        ['-e', 'process.stdin.resume();setInterval(()=>{},1000)'],
        {
          ...baseOptions(),
          testHook: 'skip-node-resume',
        },
      );
      session.on('error', () => {});
      try {
        await session.ready;
        if (scenario.raw) {
          session._socket.write('resume\n');
          await delay(50);
          session._socket.write(scenario.raw);
          if (scenario.endInput) session._socket.end();
        } else {
          for (const line of scenario.lines) session._socket.write(`${line}\n`);
        }
        const outcome = await Promise.race([
          session.completion().then(
            (value) => ({ value }),
            (error) => ({ error }),
          ),
          delay(6000).then(() => ({ timeout: true })),
        ]);
        assert.equal(outcome.timeout, undefined, `${scenario.name}: liquidação não concluiu`);
        assert.ok(
          outcome.error,
          `${scenario.name}: protocolo inválido virou sucesso: ${JSON.stringify(outcome.value)}`,
        );
        assert.equal(
          outcome.error.stage,
          'stop-unproven',
          `${scenario.name}: ${outcome.error.message}`,
        );
        assert.equal(outcome.error.stopProven, false);
        assert.equal(outcome.error.retainLock, true);
        assert.equal(session._stopped.proven, false, `${scenario.name}: proven=1 foi aceito`);
        assert.equal(await waitGone([session.pid, session.supervisorPid], 5000), true);
      } finally {
        await killTracked([session.pid, session.supervisorPid]);
      }
    }
  },
);

test('Windows parser real rejeita frames e sufixo depois do stop', windowsOnly, async () => {
  const cases = [
    { name: 'stop duplicado', trailing: 'stop\n', endInput: false },
    { name: 'resume depois do stop', trailing: 'resume\n', endInput: false },
    { name: 'sufixo sem newline', trailing: 'stdin-eof', endInput: true },
  ];
  for (const scenario of cases) {
    const session = startWindowsJob(
      process.execPath,
      ['-e', 'process.stdin.resume();setInterval(()=>{},1000)'],
      { ...baseOptions(), testHook: 'skip-node-resume' },
    );
    session.on('error', () => {});
    try {
      await session.ready;
      session._socket.write('resume\n');
      await delay(100);
      session._socket.write(`stop\n${scenario.trailing}`);
      if (scenario.endInput) session._socket.end();
      const outcome = await Promise.race([
        session.completion().then(
          (value) => ({ value }),
          (error) => ({ error }),
        ),
        delay(10000).then(() => ({ timeout: true })),
      ]);
      assert.equal(outcome.timeout, undefined, `${scenario.name}: liquidação pendurou`);
      assert.ok(
        outcome.error,
        `${scenario.name}: stop com excedente virou sucesso: ${JSON.stringify(outcome.value)}`,
      );
      assert.equal(outcome.error.name, 'WindowsJobStopError');
      assert.equal(
        outcome.error.stage,
        'stop-unproven',
        `${scenario.name}: ${outcome.error.message}`,
      );
      assert.equal(outcome.error.stopProven, false);
      assert.equal(outcome.error.retainLock, true);
      assert.equal(session._stopped.proven, false, `${scenario.name}: proven=1 foi aceito`);
      assert.equal(await waitGone([session.pid, session.supervisorPid], 5000), true);
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
    }
  }
});

test(
  'Windows aceita eventos entregues depois do supervisor sair e do fim de stdout/stderr',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-order-exit-'));
    const { launcher, marker } = await writeSyntheticSupervisor(dir, 'exit-before-events');
    const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
      ...baseOptions(),
      supervisorScript: launcher,
      startupTimeoutMs: ADMISSION_TIMEOUT_MS,
    });
    session.on('error', () => {});
    try {
      const result = await session.completion();
      assert.deepEqual(result, { code: 0, stdout: '', stderr: '' });
    } finally {
      const writerPid = await syntheticWriterPid(marker);
      await killTracked([session.pid, session.supervisorPid, writerPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test('Windows aguarda EOF de controle antes de concluir sucesso', windowsOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-job-order-control-'));
  const { launcher, marker } = await writeSyntheticSupervisor(dir, 'terminal-before-control-eof');
  const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
    ...baseOptions(),
    supervisorScript: launcher,
    startupTimeoutMs: ADMISSION_TIMEOUT_MS,
  });
  session.on('error', () => {});
  try {
    const early = await Promise.race([
      session.completion().then(
        () => 'resolved',
        (error) => error,
      ),
      delay(500).then(() => 'pending'),
    ]);
    assert.equal(early, 'pending', 'completion concluiu antes do EOF de controle');
    const result = await session.completion();
    assert.deepEqual(result, { code: 0, stdout: '', stderr: '' });
  } finally {
    const writerPid = await syntheticWriterPid(marker);
    await killTracked([session.pid, session.supervisorPid, writerPid]);
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test(
  'Windows aguarda o supervisor encerrar depois do terminal e do EOF de controle',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-order-supervisor-'));
    const { launcher, marker } = await writeSyntheticSupervisor(
      dir,
      'terminal-before-supervisor-exit',
    );
    const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
      ...baseOptions(),
      supervisorScript: launcher,
      startupTimeoutMs: ADMISSION_TIMEOUT_MS,
    });
    session.on('error', () => {});
    try {
      const deadline = Date.now() + ADMISSION_TIMEOUT_MS;
      while (!existsSync(marker) && Date.now() < deadline) await delay(50);
      assert.equal(existsSync(marker), true, 'supervisor sintético não enviou o terminal');
      const early = await Promise.race([
        session.completion().then(
          () => 'resolved',
          (error) => error,
        ),
        delay(500).then(() => 'pending'),
      ]);
      assert.equal(early, 'pending', 'completion concluiu antes do supervisor encerrar');
      await writeFile(`${marker}.exit`, 'sair', 'utf8');
      const result = await session.completion();
      assert.deepEqual(result, { code: 0, stdout: '', stderr: '' });
    } finally {
      const writerPid = await syntheticWriterPid(marker);
      await killTracked([session.pid, session.supervisorPid, writerPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test('Windows não mascara evento duplicado depois do protocolo terminal', windowsOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-job-order-duplicate-'));
  const { launcher, marker } = await writeSyntheticSupervisor(dir, 'duplicate-after-terminal');
  const session = startWindowsJob(process.execPath, ['-e', 'process.exit(0)'], {
    ...baseOptions(),
    supervisorScript: launcher,
    startupTimeoutMs: ADMISSION_TIMEOUT_MS,
  });
  session.on('error', () => {});
  try {
    await assert.rejects(session.completion(), (error) => {
      assert.equal(error.stage, 'protocol');
      assert.equal(error.stopProven, false);
      return true;
    });
  } finally {
    const writerPid = await syntheticWriterPid(marker);
    await killTracked([session.pid, session.supervisorPid, writerPid]);
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test(
  'Windows rejeita ready/leader-exit/stopped fora de ordem ou com campo vazio',
  windowsOnly,
  async () => {
    for (const testHook of [
      'protocol-empty-leader-exit',
      'protocol-duplicate-leader-exit',
      'protocol-stopped-first',
      'protocol-empty-stopped',
    ]) {
      const session = startWindowsJob(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
        ...baseOptions(),
        testHook,
      });
      session.on('error', () => {});
      try {
        await session.ready;
        await assert.rejects(session.stop({ timeoutMs: 5000 }), (error) => {
          assert.equal(error.stage, 'protocol', `${testHook}: ${error.message}`);
          assert.equal(error.stopProven, false);
          return true;
        });
        await assert.rejects(session.completion(), (error) => {
          assert.equal(error.stage, 'protocol');
          assert.equal(error.stopProven, false);
          return true;
        });
        assert.equal(await waitGone([session.pid, session.supervisorPid], 5000), true);
      } finally {
        await killTracked([session.pid, session.supervisorPid]);
      }
    }
  },
);

test(
  'Windows não retoma processo suspenso sem confirmação validada do Node',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-no-resume-'));
    const marker = join(dir, 'marcador.txt');
    const session = startWindowsJob(process.execPath, ['-e', writeMarkerScript(marker)], {
      ...baseOptions(),
      testHook: 'skip-node-resume',
    });
    session.on('error', () => {});
    try {
      const ready = await session.ready;
      await delay(600);
      assert.equal(existsSync(marker), false, 'comando retomado sem confirmação do Node');
      assert.deepEqual(await session.stop(), { proven: true, pid: ready.pid });
      assert.equal(session.resumedLeader, false);
      await delay(300);
      assert.equal(existsSync(marker), false, 'comando retomado após stop antes do resume');
      assert.equal(await waitGone([ready.pid, session.supervisorPid], 5000), true);
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows respeita stop antes do ResumeThread durante a janela de adiamento',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-stop-resume-'));
    const marker = join(dir, 'marcador.txt');
    const session = startWindowsJob(process.execPath, ['-e', writeMarkerScript(marker)], {
      ...baseOptions(),
      testHook: 'resume-delay',
      testDelayMs: 1500,
    });
    session.on('error', () => {});
    try {
      const ready = await session.ready;
      await delay(100);
      assert.deepEqual(await session.stop({ timeoutMs: 5000 }), { proven: true, pid: ready.pid });
      assert.equal(session.resumedLeader, false, 'ResumeThread foi chamado após o stop');
      await delay(300);
      assert.equal(existsSync(marker), false, 'retomou o comando após o stop');
      assert.equal(await waitGone([ready.pid, session.supervisorPid], 5000), true);
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows aborta durante a inicialização sem reabrir listener nem pendurar',
  windowsOnly,
  async () => {
    const session = startWindowsJob(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
      ...baseOptions(),
      testHook: 'connect-delay',
      testDelayMs: 5000,
    });
    session.on('error', () => {});
    try {
      await delay(300);
      const stopError = await session.stop().catch((error) => error);
      assert.equal(stopError.name, 'WindowsJobStopError');
      assert.equal(stopError.stage, 'pre-admission-stop');
      assert.equal(stopError.stopProven, false);
      assert.equal(stopError.retainLock, true);
      const outcome = await Promise.race([
        session.completion().then(
          () => 'resolved',
          (error) => error,
        ),
        delay(3000).then(() => 'hung'),
      ]);
      assert.notEqual(outcome, 'hung', 'completion pendurou após abort na inicialização');
      assert.equal(outcome.stopProven, false);
      assert.equal(session._server.listening, false);
      assert.equal(session._outputServer.listening, false);
      assert.equal(await waitGone([session.supervisorPid], 5000), true);
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
    }
  },
);

test('Windows aborta entre os listeners sem reabrir o pipe de saída', windowsOnly, async () => {
  const session = startWindowsJob(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
    ...baseOptions(),
    testHook: 'abort-before-output-listen',
  });
  session.on('error', () => {});
  try {
    const readyError = await session.ready.catch((error) => error);
    assert.equal(readyError.name, 'WindowsJobStopError');
    assert.equal(readyError.stage, 'pre-admission-stop');
    assert.equal(readyError.stopProven, false);
    assert.equal(readyError.retainLock, true);
    assert.equal(session._server.listening, false);
    assert.equal(session._outputServer.listening, false);
    assert.equal(session.supervisorPid, 0);
    const outcome = await Promise.race([
      session.completion().then(
        () => 'resolved',
        (error) => error,
      ),
      delay(3000).then(() => 'hung'),
    ]);
    assert.notEqual(outcome, 'hung', 'completion pendurou após abort entre listeners');
    assert.equal(outcome.stopProven, false);
  } finally {
    await killTracked([session.pid, session.supervisorPid]);
  }
});

test(
  'Windows cancela admissão com SIGINT real sem retomar nem liberar o lock',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-signal-'));
    const spacedDir = join(dir, 'fixture sinal com espacos');
    await mkdir(spacedDir, { recursive: true });
    const resultFile = join(spacedDir, 'resultado.json');
    const marker = join(spacedDir, 'marcador.txt');
    const lockFile = join(spacedDir, 'next-env.lock');
    const startedFile = join(spacedDir, 'iniciado.txt');
    const pidFile = join(spacedDir, 'child.pid');
    const childFile = join(spacedDir, 'child.mjs');
    const helperFile = join(spacedDir, 'signal.ps1');
    const escapePowerShell = (value) => value.replaceAll("'", "''");
    const jobModuleUrl = `file:///${join(root, 'scripts/web-e2e-windows-job.mjs').replaceAll('\\', '/')}`;
    const runnerModuleUrl = `file:///${join(root, 'scripts/web-e2e.mjs').replaceAll('\\', '/')}`;
    const childSource = String.raw`
import { existsSync, writeFileSync } from 'node:fs';
import { startWindowsJob } from ${JSON.stringify(jobModuleUrl)};
import { acquireNextEnvLock, releaseNextEnvLock } from ${JSON.stringify(runnerModuleUrl)};
const [resultFile, markerFile, lockFile, startedFile] = process.argv.slice(2);
const receivedArgs = process.argv.slice(2);
const controller = new AbortController();
const onSignal = () => controller.abort(new Error('interrupção real do host'));
process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);
const result = { argv: receivedArgs };
let lock;
try {
  lock = await acquireNextEnvLock({
    lockFile,
    runId: 'aaaa11',
    timeoutMs: 5000,
    signal: controller.signal,
  });
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.includes('=')));
  const session = startWindowsJob(process.execPath, ['-e', ${JSON.stringify(writeMarkerScript(marker))}], {
    cwd: ${JSON.stringify(root)},
    env,
    stopTimeoutMs: 5000,
    startupTimeoutMs: ${ADMISSION_TIMEOUT_MS},
    testHook: 'ready-delay',
    testDelayMs: 4000,
    signal: controller.signal,
  });
  session.on('error', () => {});
  writeFileSync(startedFile, String(session.supervisorPid));
  try {
    await session.ready;
    result.ready = true;
    await new Promise((done) => setTimeout(done, 500));
  } catch (error) {
    result.name = error.name;
    result.stage = error.stage;
    result.stopProven = error.stopProven;
    result.retainLock = error.retainLock;
    result.message = error.message;
  }
  result.marker = existsSync(markerFile);
  result.resumedLeader = session.resumedLeader;
  result.supervisorPid = session.supervisorPid;
  result.leaderPid = session.pid;
} catch (error) {
  result.outer = {
    name: error.name,
    stage: error.stage,
    retainLock: error.retainLock,
    message: error.message,
  };
} finally {
  if (lock && !result.retainLock && !result.outer?.retainLock) {
    try { await releaseNextEnvLock(lock); } catch {}
  }
  writeFileSync(resultFile, JSON.stringify(result));
  process.exit(0);
}
`;
    const signalHelper = `param()
$ErrorActionPreference = 'Stop'
${powerShellArgumentHelper}
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class MuvitSignal {
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool FreeConsole();
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool AttachConsole(uint pid);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool GenerateConsoleCtrlEvent(uint evt, uint group);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool SetConsoleCtrlHandler(IntPtr handler, bool add);
}
'@
[MuvitSignal]::SetConsoleCtrlHandler([IntPtr]::Zero, $false) | Out-Null
$p = Start-Process -FilePath '${escapePowerShell(process.execPath)}' -ArgumentList (Join-MuvitProcessArguments @('${escapePowerShell(childFile)}', '${escapePowerShell(resultFile)}', '${escapePowerShell(marker)}', '${escapePowerShell(lockFile)}', '${escapePowerShell(startedFile)}')) -PassThru
[System.IO.File]::WriteAllText('${escapePowerShell(pidFile)}', [string]$p.Id, (New-Object System.Text.UTF8Encoding($false)))
$deadline = (Get-Date).AddSeconds(120)
while (-not (Test-Path '${escapePowerShell(startedFile)}') -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 50 }
if (-not (Test-Path '${escapePowerShell(startedFile)}')) { exit 7 }
if (-not [MuvitSignal]::FreeConsole()) { exit 8 }
if (-not [MuvitSignal]::AttachConsole([uint32]$p.Id)) { exit 9 }
[MuvitSignal]::SetConsoleCtrlHandler([IntPtr]::Zero, $true) | Out-Null
if (-not [MuvitSignal]::GenerateConsoleCtrlEvent(0, 0)) { exit 10 }
$p.WaitForExit(10000) | Out-Null
if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force; exit 11 }
exit 0
`;
    await writeFile(childFile, childSource, 'utf8');
    await writeFile(helperFile, signalHelper, 'utf8');
    const helper = spawn(
      powershell,
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helperFile],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stderr = '';
    helper.stderr.setEncoding('utf8');
    helper.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    let result;
    try {
      const code = await Promise.race([
        new Promise((done, fail) => {
          helper.once('error', fail);
          helper.once('close', done);
        }),
        delay(20000).then(() => 'timeout'),
      ]);
      assert.notEqual(code, 'timeout', 'sinal real pendurou o processo');
      assert.equal(code, 0, `ponte de sinal falhou: ${stderr}`);
      assert.equal(existsSync(resultFile), true, 'processo filho não registrou o resultado');
      result = JSON.parse(await readFile(resultFile, 'utf8'));
      assert.deepEqual(result.argv, [resultFile, marker, lockFile, startedFile]);
      assert.equal(result.name, 'WindowsJobStopError', JSON.stringify(result));
      assert.equal(result.stage, 'pre-admission-stop');
      assert.equal(result.stopProven, false);
      assert.equal(result.retainLock, true);
      assert.equal(result.marker, false, 'comando foi retomado após a interrupção');
      assert.notEqual(result.resumedLeader, true);
      assert.equal(existsSync(lockFile), true, 'lock foi liberado após cancelamento da admissão');
      assert.equal(JSON.parse(await readFile(lockFile, 'utf8')).runId, 'aaaa11');
      if (result.supervisorPid)
        assert.equal(await waitGone([result.supervisorPid], 5000), true, 'supervisor sobreviveu');
    } finally {
      const childPid = existsSync(pidFile) ? Number(await readFile(pidFile, 'utf8')) : 0;
      await killTracked([helper.pid, childPid, result?.supervisorPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test('Windows fecha o handle da thread do líder uma única vez', async () => {
  const source = await readFile(join(root, 'scripts/web-e2e-windows-job.ps1'), 'utf8');
  const start = source.indexOf('namespace Muvit.Windows');
  const end = source.indexOf("'@", start);
  assert.ok(start > 0 && end > start);
  const body = source.slice(start, end);
  assert.equal(body.includes('CloseHandle(processInformation.hThread)'), false);
  assert.equal(body.includes('CloseLeaderThread(ref threadHandle)'), true);
  assert.equal((body.match(/CloseLeaderThread\(/g) ?? []).length, 2);
  const helperStart = body.indexOf('private static void CloseLeaderThread');
  assert.ok(helperStart > 0);
  const helper = body.slice(helperStart, helperStart + 500);
  assert.match(helper, /CloseHandle\(handle\)/);
  assert.match(helper, /handle = IntPtr\.Zero/);
  assert.equal((helper.match(/CloseHandle\(handle\)/g) ?? []).length, 1);
});

test(
  'Windows PowerShell 5.1 decodifica diagnósticos pt-BR do script UTF-8 com BOM',
  windowsOnly,
  async () => {
    const bytes = await readFile(windowsJobScriptPath);
    assert.deepEqual(
      [...bytes.subarray(0, 3)],
      [0xef, 0xbb, 0xbf],
      'script PowerShell sem BOM UTF-8',
    );
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-bom-'));
    const probeFile = join(dir, 'probe-literal.ps1');
    const literalFile = join(dir, 'literal.txt');
    const probe = [
      'param([string]$Path, [string]$Output)',
      '$tokens = $null',
      '$errors = $null',
      '$ast = [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$tokens, [ref]$errors)',
      "$literal = $ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.StringConstantExpressionAst] -and $node.Value.Contains('poss') }, $true) | Select-Object -First 1",
      'if ($null -eq $literal) { exit 5 }',
      '[System.IO.File]::WriteAllText($Output, [string]$literal.Value, (New-Object System.Text.UTF8Encoding($false)))',
      'exit 0',
      '',
    ].join('\n');
    await writeFile(probeFile, probe, 'utf8');
    try {
      await new Promise((resolve, reject) => {
        execFile(
          powershell,
          [
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            probeFile,
            '-Path',
            windowsJobScriptPath,
            '-Output',
            literalFile,
          ],
          (error, _stdout, stderr) => {
            if (error) {
              reject(new Error(`${error.message}\n${stderr}`));
              return;
            }
            resolve();
          },
        );
      });
      const literal = await readFile(literalFile, 'utf8');
      assert.ok(
        literal.includes('não foi possível abrir a instância do Node pai'),
        `literal pt-BR decodificado incorretamente: ${literal.slice(0, 200)}`,
      );
      assert.equal(literal.includes('nǜo'), false, 'mojibake em diagnóstico 5.1');
      assert.equal(literal.includes('poss��vel'), false, 'mojibake em diagnóstico 5.1');
      assert.equal(literal.includes('criação do processo'), true);
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows não prova zero no término natural sem EOF do canal de controle',
  windowsOnly,
  async () => {
    const session = startWindowsJob(
      process.execPath,
      ['-e', 'setTimeout(()=>process.exit(7),400)'],
      {
        ...baseOptions(),
        testHook: 'hold-control-after-leader-exit',
      },
    );
    session.on('error', () => {});
    try {
      await session.ready;
      assert.equal(
        await waitFor(() => session._stopped !== null, 8000),
        true,
        'supervisor não enviou stopped',
      );
      assert.equal(
        session._stopped.proven,
        false,
        'proven=1 foi publicado sem EOF confirmado no término natural',
      );
      const outcome = await Promise.race([
        session.completion().then(
          (value) => ({ value }),
          (error) => ({ error }),
        ),
        delay(5000).then(() => ({ timeout: true })),
      ]);
      assert.equal(outcome.timeout, undefined, 'completion pendurou após stopped não comprovado');
      assert.ok(
        outcome.error,
        `término natural sem EOF virou sucesso: ${JSON.stringify(outcome.value)}`,
      );
      assert.equal(outcome.error.stopProven, false);
      assert.equal(outcome.error.retainLock, true);
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
    }
  },
);

test(
  'Windows não prova zero com stop pendente e leitor de controle suspenso',
  windowsOnly,
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-job-reader-suspended-'));
    const marker = join(dir, 'lider-iniciou.txt');
    const leader = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'iniciou');setTimeout(()=>process.exit(3),600)`;
    const session = startWindowsJob(process.execPath, ['-e', leader], {
      ...baseOptions(),
      testHook: 'suspend-reader',
      testDelayMs: 3000,
      startupTimeoutMs: ADMISSION_TIMEOUT_MS,
    });
    session.on('error', () => {});
    try {
      await session.ready;
      assert.equal(
        await waitFor(() => existsSync(marker), 5000),
        true,
        'líder não iniciou após o resume',
      );
      session._socket.write('stop\n');
      assert.equal(
        await waitFor(() => session._stopped !== null, 10000),
        true,
        'supervisor não enviou stopped',
      );
      assert.equal(
        session._stopped.proven,
        false,
        'proven=1 foi publicado com stop pendente e leitor suspenso',
      );
      const outcome = await Promise.race([
        session.completion().then(
          (value) => ({ value }),
          (error) => ({ error }),
        ),
        delay(5000).then(() => ({ timeout: true })),
      ]);
      assert.equal(outcome.timeout, undefined, 'completion pendurou após stopped não comprovado');
      assert.ok(outcome.error, `stop pendente virou sucesso: ${JSON.stringify(outcome.value)}`);
      assert.equal(outcome.error.stopProven, false);
      assert.equal(outcome.error.retainLock, true);
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);

test(
  'Windows não prova zero quando a confirmação do drain chega depois do prazo',
  windowsOnly,
  async () => {
    const session = startWindowsJob(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
      ...baseOptions(),
      testHook: 'drain-delay',
      testDelayMs: 2200,
    });
    session.on('error', () => {});
    try {
      await session.ready;
      session._socket.write('stop\n');
      session._socket.end();
      assert.equal(
        await waitFor(() => session._stopped !== null, 10000),
        true,
        'supervisor não enviou stopped',
      );
      assert.equal(
        session._stopped.proven,
        false,
        'proven=1 foi publicado antes da confirmação do drain',
      );
      const outcome = await Promise.race([
        session.completion().then(
          (value) => ({ value }),
          (error) => ({ error }),
        ),
        delay(5000).then(() => ({ timeout: true })),
      ]);
      assert.equal(outcome.timeout, undefined, 'completion pendurou após stopped não comprovado');
      assert.ok(
        outcome.error,
        `confirmação tardia do drain virou sucesso: ${JSON.stringify(outcome.value)}`,
      );
      assert.equal(outcome.error.stopProven, false);
      assert.equal(outcome.error.retainLock, true);
      await delay(1200);
      assert.equal(
        session._stopped.proven,
        false,
        'confirmação tardia do drain alterou o proven já publicado',
      );
    } finally {
      await killTracked([session.pid, session.supervisorPid]);
    }
  },
);
