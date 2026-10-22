import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scenarios = ['aluno', 'professor', 'isolamento'];
const defaultPorts = { api: 3344, metro: 8094, db: 5444 };

export function parseArgs(argv) {
  const values = new Map();
  const flags = new Set(['--help']);
  const supported = new Set([
    '--scenario',
    '--mode',
    '--device',
    '--api-port',
    '--metro-port',
    '--db-port',
    '--app-id',
    '--launch-url',
    '--avd-name',
    '--artifact-scope',
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (flags.has(argument)) continue;
    if (!supported.has(argument)) throw new Error(`Opção desconhecida: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Valor ausente para ${argument}`);
    if (values.has(argument)) throw new Error(`Opção repetida: ${argument}`);
    values.set(argument, value);
    index += 1;
  }

  if (argv.includes('--help')) return { help: true };
  const scenario = values.get('--scenario');
  if (!scenario || ![...scenarios, 'all'].includes(scenario)) {
    throw new Error('--scenario deve ser aluno, professor, isolamento ou all');
  }
  const mode = values.get('--mode') ?? 'android';
  if (!mode || !['android', 'api-only'].includes(mode)) {
    throw new Error('--mode deve ser android ou api-only');
  }
  const device = values.get('--device');
  if (mode === 'android' && !device) throw new Error('--device é obrigatório no modo android');
  if (device && !/^[A-Za-z0-9._:-]+$/.test(device)) throw new Error('--device inválido');

  const ports = Object.fromEntries(
    Object.entries(defaultPorts).map(([name, fallback]) => {
      const value = values.get(`--${name}-port`);
      const port = value === undefined ? fallback : Number(value);
      if (!Number.isInteger(port) || port < 1024 || port > 65535) {
        throw new Error(`Porta inválida para ${name}`);
      }
      return [name, port];
    }),
  );
  if (new Set(Object.values(ports)).size !== Object.values(ports).length) {
    throw new Error('As portas devem ser distintas');
  }

  const artifactScope = values.get('--artifact-scope') ?? 'mobile-e2e';
  if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(artifactScope)) {
    throw new Error('--artifact-scope deve conter apenas letras minúsculas, números e hífens');
  }
  const appId = values.get('--app-id') ?? 'host.exp.exponent';
  if (!/^[A-Za-z0-9._]+$/.test(appId)) throw new Error('--app-id inválido');
  const launchUrl = values.get('--launch-url');
  if (launchUrl && !/^exp:\/\//.test(launchUrl))
    throw new Error('--launch-url deve começar com exp://');

  return {
    scenarios: scenario === 'all' ? scenarios : [scenario],
    mode,
    device,
    ports,
    appId,
    avdName: values.get('--avd-name') ?? 'muvit-mobile-e2e',
    launchUrl: launchUrl ?? `exp://127.0.0.1:${ports.metro}`,
    artifactScope,
  };
}

export function containerNameForRun(runId) {
  if (!/^[a-f0-9]{12}$/.test(runId)) throw new Error('runId inválido');
  return `muvit_mobile_e2e_${runId}_test`;
}

export function assertOwnedContainer(container, runId) {
  const expected = containerNameForRun(runId);
  if (
    container.name !== expected ||
    container.runId !== runId ||
    container.owner !== 'muvit-mobile-e2e'
  ) {
    throw new Error('Container não pertence a este run');
  }
}

export function sanitizeRecursively(value, secrets) {
  if (typeof value === 'string') {
    return secrets
      .filter(Boolean)
      .reduce((text, secret) => text.split(secret).join('[REDACTED]'), value);
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeRecursively(item, secrets));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeRecursively(item, secrets)]),
    );
  }
  return value;
}

export async function runCommand(command, args, options = {}) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const batch = process.platform === 'win32' && /\.(bat|cmd)$/i.test(command);
    const invocation = batch
      ? {
          command: process.env.ComSpec ?? 'cmd.exe',
          args: ['/d', '/s', '/c', `"${[command, ...args].map(quoteBatchArgument).join(' ')}"`],
        }
      : { command, args };
    const child = spawn(invocation.command, invocation.args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      windowsVerbatimArguments: batch,
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
      options.onOutput?.(stdout, stderr);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
      options.onOutput?.(stdout, stderr);
    });
    child.once('error', rejectPromise);
    child.once('close', (code, signal) =>
      resolvePromise({ code: code ?? 1, signal, stdout, stderr }),
    );
  });
}

function quoteBatchArgument(value) {
  if (/["\r\n%]/.test(value)) throw new Error('Argumento incompatível com execução batch segura');
  return `"${value}"`;
}

export async function runWithResources(operation) {
  const cleanups = [];
  const resources = {
    registerCleanup(name, cleanup) {
      cleanups.push({ name, cleanup });
    },
  };
  let result;
  let failure;
  try {
    result = await operation(resources);
  } catch (error) {
    failure = error;
  } finally {
    const cleanupErrors = [];
    for (const resource of cleanups.reverse()) {
      try {
        await resource.cleanup();
      } catch (error) {
        cleanupErrors.push({ name: resource.name, error });
      }
    }
    if (failure === undefined && cleanupErrors.length > 0) {
      failure = new Error(
        `Falha ao limpar recurso próprio: ${cleanupErrors.map((item) => item.name).join(', ')}`,
      );
    }
  }
  if (failure !== undefined) throw failure;
  return result;
}

function safeEnvironment(values = {}) {
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
    'java_home',
    'android_home',
    'android_sdk_root',
    'comspec',
    'pathext',
    'docker_host',
    'docker_context',
  ]);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => allowed.has(key.toLowerCase())),
  );
  return Object.fromEntries(
    Object.entries({ ...env, ...values }).filter(([, value]) => value !== undefined),
  );
}

function requireSuccess(result, label) {
  if (result.code !== 0) {
    const error = new Error(`${label} terminou com código ${result.code}`);
    error.exitCode = result.code;
    throw error;
  }
  return result;
}

async function assertPortFree(port) {
  await new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.once('error', (error) =>
      rejectPromise(new Error(`Porta ${port} ocupada ou indisponível`)),
    );
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
      server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
    });
  });
}

async function waitForHttp(url, child, timeoutMs = 45_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (child.spawnFailure) throw child.spawnFailure;
    if (child.exitCode !== null)
      throw new Error('Serviço encerrou antes de ficar pronto; consulte os logs');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
  }
  throw new Error(`Tempo limite aguardando serviço em ${url}`);
}

function startChild(command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  for (const stream of [child.stdout, child.stderr]) {
    stream?.setEncoding('utf8');
    stream?.on('data', (chunk) => {
      output += chunk;
    });
  }
  child.output = () => output;
  child.once('error', (error) => {
    child.spawnFailure = error;
  });
  return child;
}

async function stopChild(child) {
  if (child.exitCode !== null || child.spawnFailure || !child.pid) return;
  if (process.platform === 'win32') {
    const result = await runCommand('taskkill.exe', ['/PID', String(child.pid), '/T', '/F']);
    if (result.code !== 0 && child.exitCode === null)
      throw new Error('Não foi possível encerrar árvore do subprocesso próprio');
    return;
  }
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolvePromise) => child.once('close', resolvePromise)),
    new Promise((resolvePromise) => setTimeout(resolvePromise, 5000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function docker(args, options = {}) {
  const result = await runCommand('docker', args, { env: safeEnvironment(), ...options });
  return requireSuccess(result, 'Docker');
}

async function startDatabase(options, runId, resources) {
  const name = containerNameForRun(runId);
  const user = `e2e_${runId}`;
  const password = randomBytes(24).toString('hex');
  const databaseUrl = `postgresql://${user}:${password}@127.0.0.1:${options.ports.db}/muvit_e2e_test`;
  const network = `${name}_network`;
  await docker([
    'network',
    'create',
    '--label',
    'muvit.owner=muvit-mobile-e2e',
    '--label',
    `muvit.run=${runId}`,
    network,
  ]);
  resources.registerCleanup('postgres-network', () => docker(['network', 'rm', network]));
  resources.registerCleanup('postgres-container', async () => {
    const inspected = await runCommand(
      'docker',
      [
        'inspect',
        '--format',
        '{{.Name}}|{{index .Config.Labels "muvit.owner"}}|{{index .Config.Labels "muvit.run"}}',
        name,
      ],
      { env: safeEnvironment() },
    );
    if (inspected.code !== 0) return;
    const [containerName, owner, actualRun] = inspected.stdout.trim().replace(/^\//, '').split('|');
    assertOwnedContainer({ name: containerName, owner, runId: actualRun }, runId);
    requireSuccess(
      await runCommand('docker', ['rm', '--force', '--volumes', name], { env: safeEnvironment() }),
      'Limpeza PostgreSQL',
    );
  });
  await docker([
    'run',
    '--detach',
    '--name',
    name,
    '--network',
    network,
    '--label',
    'muvit.owner=muvit-mobile-e2e',
    '--label',
    `muvit.run=${runId}`,
    '--env',
    `POSTGRES_USER=${user}`,
    '--env',
    `POSTGRES_PASSWORD=${password}`,
    '--env',
    'POSTGRES_DB=muvit_e2e_test',
    '--publish',
    `127.0.0.1:${options.ports.db}:5432`,
    'postgres:16-alpine',
  ]);
  const end = Date.now() + 45_000;
  while (Date.now() < end) {
    const ready = await runCommand(
      'docker',
      ['exec', name, 'pg_isready', '-U', user, '-d', 'muvit_e2e_test'],
      { env: safeEnvironment() },
    );
    if (ready.code === 0) return { databaseUrl, password };
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw new Error('Tempo limite aguardando PostgreSQL exclusivo');
}

async function invokeFixture(apiUrl, runId, scenario, action, secrets, extra = {}) {
  const fixtureEnv = {
    NODE_ENV: 'test',
    DATABASE_URL: extra.databaseUrl,
    E2E_API_URL: apiUrl,
    E2E_RUN_ID: runId,
    E2E_SCENARIO: scenario,
    E2E_ACTION: action,
    E2E_DATE: extra.date,
    E2E_EXERCISE_NAME: extra.exerciseName,
    E2E_VERIFY_STAGE: extra.stage,
    E2E_MANIFEST: extra.manifest ? JSON.stringify(extra.manifest) : undefined,
    ...extra.credentialsEnv,
  };
  const env = safeEnvironment(fixtureEnv);
  const result = await runCommand(
    process.execPath,
    ['--import', 'tsx', 'test/e2e-mobile/fixtures.ts'],
    {
      cwd: join(root, 'apps/api'),
      env,
    },
  );
  if (result.code !== 0) {
    const stderr = sanitizeRecursively(result.stderr, secrets);
    const error = new Error(
      stderr.trim().slice(-3000) || `Fixture ${action} falhou com código ${result.code}`,
    );
    error.exitCode = result.code;
    throw error;
  }
  const lines = result.stdout.trim().split(/\r?\n/);
  try {
    return JSON.parse(lines.at(-1));
  } catch {
    throw new Error(`Fixture ${action} não retornou JSON válido`);
  }
}

function createFixtureCredentials(runId) {
  const password = `Ee-${randomBytes(18).toString('base64url')}-aA1!`;
  const email = (role, suffix) => `e2e-${runId}-${role}-${suffix}@example.invalid`;
  return {
    studentA: { name: `Aluno E2E ${runId}`, email: email('aluno', 'a'), password },
    studentB: { name: `Aluno E2E B ${runId}`, email: email('aluno', 'b'), password },
    trainerA: { name: `Professor E2E ${runId}`, email: email('professor', 'a'), password },
    trainerB: { name: `Professor E2E B ${runId}`, email: email('professor', 'b'), password },
  };
}

function maestroEnvironment(options, credentials, manifest, apiDate) {
  const env = {
    NODE_ENV: 'test',
    EXPO_NO_DOTENV: '1',
    EXPO_PUBLIC_SENTRY_DSN: '',
    EXPO_PUBLIC_API_URL: `http://127.0.0.1:${options.ports.api}`,
    EXPO_URL: options.launchUrl,
    E2E_APP_ID: options.appId,
    E2E_STUDENT_EMAIL: credentials.studentA.email,
    E2E_STUDENT_PASSWORD: credentials.studentA.password,
    E2E_STUDENT_B_EMAIL: credentials.studentB.email,
    E2E_STUDENT_B_PASSWORD: credentials.studentB.password,
    E2E_TRAINER_EMAIL: credentials.trainerA.email,
    E2E_TRAINER_PASSWORD: credentials.trainerA.password,
    E2E_TRAINER_B_EMAIL: credentials.trainerB.email,
    E2E_TRAINER_B_PASSWORD: credentials.trainerB.password,
    E2E_STUDENT_NAME: manifest.linkedStudents?.a?.name ?? '',
    E2E_PLAN_NAME:
      manifest.scenario === 'professor'
        ? (manifest.plans?.trainerStudentA?.name ?? '')
        : (manifest.plans?.independentA?.name ?? ''),
    E2E_TRAINER_PLAN_NAME: manifest.plans?.trainerStudentA?.name ?? '',
    E2E_STUDENT_B_PLAN_NAME: manifest.plans?.independentB?.name ?? '',
    E2E_EXERCISE_NAME: manifest.exerciseName,
  };
  const foreign = manifest.foreign ?? {};
  for (const key of ['student', 'plan', 'assessment', 'day']) {
    env[`E2E_FOREIGN_${key.toUpperCase()}_ID`] = foreign[`${key}Id`] ?? '';
  }
  for (const [key, path] of Object.entries({
    student: `/trainer/students/${foreign.studentId}`,
    plan: `/trainer/students/${foreign.studentId}/workouts/${foreign.planId}`,
    assessment: `/trainer/students/${foreign.studentId}/assessments/${foreign.assessmentId}`,
    session: `/session/${manifest.foreignIndependent?.dayId ?? foreign.dayId}`,
  }))
    env[`E2E_FOREIGN_${key.toUpperCase()}_URL`] = `${options.launchUrl}/--${path}`;
  env.E2E_REFERENCE_DATE = apiDate;
  return Object.fromEntries(
    Object.entries(env).map(([key, value]) => [
      key.startsWith('E2E_') || key === 'EXPO_URL' ? `MAESTRO_${key}` : key,
      value,
    ]),
  );
}

async function setupAndroid(options) {
  const adb = await runCommand('adb', ['-s', options.device, 'get-state'], {
    env: safeEnvironment(),
  });
  if (adb.code !== 0 || adb.stdout.trim() !== 'device')
    throw new Error(`Dispositivo Android indisponível: ${options.device}`);
  const avd = await runCommand('adb', ['-s', options.device, 'emu', 'avd', 'name'], {
    env: safeEnvironment(),
  });
  if (avd.code !== 0 || avd.stdout.split(/\r?\n/)[0].trim() !== options.avdName) {
    throw new Error(`AVD conectado não corresponde a --avd-name ${options.avdName}`);
  }
  const boot = await runCommand(
    'adb',
    ['-s', options.device, 'shell', 'getprop', 'sys.boot_completed'],
    { env: safeEnvironment() },
  );
  if (boot.code !== 0 || boot.stdout.trim() !== '1')
    throw new Error('AVD ainda não concluiu o boot');
  const hostDate = new Date().toLocaleDateString('en-CA');
  const deviceDate = await runCommand('adb', ['-s', options.device, 'shell', 'date', '+%F'], {
    env: safeEnvironment(),
  });
  if (deviceDate.code !== 0 || deviceDate.stdout.trim() !== hostDate) {
    throw new Error(
      `Data local divergente entre host (${hostDate}) e Android (${deviceDate.stdout.trim()})`,
    );
  }
  for (const port of [options.ports.api, options.ports.metro]) {
    const reverse = await runCommand('adb', ['-s', options.device, 'reverse', '--list'], {
      env: safeEnvironment(),
    });
    if (
      reverse.code !== 0 ||
      reverse.stdout.split(/\r?\n/).some((line) => line.includes(`tcp:${port}`))
    ) {
      throw new Error(
        `Já existe reverse adb em tcp:${port}; runner não reutiliza reverses prévios`,
      );
    }
  }
  return hostDate;
}

async function startMetro(options, apiUrl, resources, artifacts) {
  const metroEnv = safeEnvironment({
    NODE_ENV: 'development',
    EXPO_NO_DOTENV: '1',
    EXPO_PUBLIC_SENTRY_DSN: '',
    EXPO_PUBLIC_API_URL: apiUrl,
    CI: '1',
  });
  const metro = startChild(
    process.execPath,
    [
      join(root, 'apps/mobile/node_modules/expo/bin/cli'),
      'start',
      '--go',
      '--host',
      'localhost',
      '--port',
      String(options.ports.metro),
    ],
    { cwd: join(root, 'apps/mobile'), env: metroEnv },
  );
  resources.registerCleanup('metro-process', () => stopChild(metro));
  resources.registerCleanup('metro-log', async () =>
    writeFile(join(artifacts, 'metro.log'), metro.output(), 'utf8'),
  );
  await waitForHttp(`http://127.0.0.1:${options.ports.metro}/status`, metro, 90_000);
  for (const port of [options.ports.api, options.ports.metro]) {
    requireSuccess(
      await runCommand('adb', ['-s', options.device, 'reverse', `tcp:${port}`, `tcp:${port}`], {
        env: safeEnvironment(),
      }),
      'ADB reverse',
    );
    resources.registerCleanup(`adb-reverse-${port}`, async () => {
      requireSuccess(
        await runCommand('adb', ['-s', options.device, 'reverse', '--remove', `tcp:${port}`], {
          env: safeEnvironment(),
        }),
        'Limpeza ADB reverse',
      );
    });
  }
}

async function maestroExecutable() {
  const candidates =
    process.platform === 'win32'
      ? [
          join(homedir(), '.maestro', 'bin', 'maestro.bat'),
          ...String(process.env.PATH ?? process.env.Path ?? '')
            .split(';')
            .map((path) => join(path, 'maestro.bat')),
        ]
      : ['maestro'];
  if (process.platform !== 'win32') return candidates[0];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }
  throw new Error('maestro.bat não encontrado no PATH ou em ~/.maestro/bin');
}

export async function sanitizeArtifactFiles(directory, secrets) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await sanitizeArtifactFiles(path, secrets);
    else if (entry.isFile() && /\.(json|log|txt|ya?ml|xml|html|csv)$/i.test(entry.name)) {
      const contents = await readFile(path, 'utf8');
      const sanitized = sanitizeRecursively(contents, secrets);
      if (sanitized !== contents) await writeFile(path, sanitized, 'utf8');
    }
  }
}

async function runMaestro(options, scenario, fixture, date, artifacts) {
  const secrets = Object.values(fixture.credentials).flatMap((credential) => [
    credential.email,
    credential.password,
  ]);
  const maestroEnv = safeEnvironment({
    ...maestroEnvironment(options, fixture.credentials, fixture.manifest, date),
    ANDROID_SERIAL: options.device,
  });
  const flow = join(root, '.maestro/mobile', `${scenario}.yaml`);
  const command = await maestroExecutable();
  const args = [
    '--device',
    options.device,
    'test',
    flow,
    '--test-output-dir',
    artifacts,
    '--debug-output',
    artifacts,
  ];
  let result;
  try {
    result = await runCommand(command, args, {
      cwd: root,
      env: maestroEnv,
      onOutput: (stdout, stderr) => {
        const completeLines = (text) => text.slice(0, text.lastIndexOf('\n') + 1);
        writeFileSync(
          join(artifacts, `${scenario}-maestro.log`),
          sanitizeRecursively(`${completeLines(stdout)}\n${completeLines(stderr)}`, secrets),
          'utf8',
        );
      },
    });
  } finally {
    await sanitizeArtifactFiles(artifacts, secrets);
  }
  const sanitizedOutput = sanitizeRecursively(
    { stdout: result.stdout, stderr: result.stderr },
    secrets,
  );
  await writeFile(
    join(artifacts, `${scenario}-maestro.log`),
    `${sanitizedOutput.stdout}\n${sanitizedOutput.stderr}`,
    'utf8',
  );
  if (result.code !== 0) {
    const error = new Error(`Maestro falhou no cenário ${scenario} com código ${result.code}`);
    error.exitCode = result.code;
    throw error;
  }
  return true;
}

export async function runScenario(options, scenario, context, dependencies = {}) {
  const executeFixture = dependencies.invokeFixture ?? invokeFixture;
  const executeMaestro = dependencies.runMaestro ?? runMaestro;
  const { runId, apiUrl, databaseUrl, artifacts, deviceDate } = context;
  const credentials = createFixtureCredentials(`${runId}-${scenario}`);
  const secrets = Object.values(credentials).flatMap((credential) => [
    credential.email,
    credential.password,
  ]);
  context.artifactSecrets?.push(...secrets);
  const fixtureEnv = {
    studentA: credentials.studentA,
    studentB: credentials.studentB,
    trainerA: credentials.trainerA,
    trainerB: credentials.trainerB,
  };
  const credentialsEnv = { E2E_CREDENTIALS: JSON.stringify(fixtureEnv) };
  const fixtureOptions = {
    databaseUrl,
    date: deviceDate,
    exerciseName: `Exercicio E2E ${runId}-${scenario}`,
    credentialsEnv,
  };
  const prepared = await executeFixture(
    apiUrl,
    runId,
    scenario,
    'prepare',
    secrets,
    fixtureOptions,
  );
  const manifest = prepared.manifest;
  if (!manifest) throw new Error(`Fixture não retornou manifesto de ${scenario}`);
  let maestroExecuted = false;
  if (options.mode === 'android') {
    await executeMaestro(options, scenario, { credentials, manifest }, deviceDate, artifacts);
    maestroExecuted = true;
  }
  const result = await executeFixture(
    apiUrl,
    runId,
    scenario,
    scenario === 'isolamento' ? 'isolation' : 'verify',
    secrets,
    {
      ...fixtureOptions,
      manifest,
      stage: maestroExecuted ? 'result' : 'setup',
    },
  );
  return { scenario, maestroExecuted, manifest, result };
}

export async function run(options) {
  const runId = randomBytes(6).toString('hex');
  const artifactDir = resolve(root, 'artifacts', options.artifactScope, runId);
  await mkdir(artifactDir, { recursive: true });
  const outcomes = [];
  const artifactSecrets = [];
  const report = {
    runId,
    mode: options.mode,
    device: options.device ?? null,
    avdName: options.mode === 'android' ? options.avdName : null,
    status: 'failed',
    scenarios: outcomes,
    artifacts: artifactDir,
  };
  try {
    const gitOptions = { cwd: root, env: safeEnvironment() };
    const head = requireSuccess(
      await runCommand('git', ['rev-parse', 'HEAD'], gitOptions),
      'Git HEAD',
    );
    const branch = requireSuccess(
      await runCommand('git', ['branch', '--show-current'], gitOptions),
      'Git branch',
    );
    const status = requireSuccess(
      await runCommand('git', ['status', '--porcelain'], gitOptions),
      'Git status',
    );
    report.context = {
      head: head.stdout.trim(),
      branch: branch.stdout.trim(),
      worktree: root,
      dirty: Boolean(status.stdout.trim()),
    };
    const deviceDate =
      options.mode === 'android'
        ? await setupAndroid(options)
        : new Date().toLocaleDateString('en-CA');
    for (const port of [
      options.ports.api,
      options.ports.db,
      ...(options.mode === 'android' ? [options.ports.metro] : []),
    ]) {
      await assertPortFree(port);
    }

    await runWithResources(async (resources) => {
      await requireSuccess(
        await runCommand('docker', ['version', '--format', '{{.Server.Version}}'], {
          env: safeEnvironment(),
        }),
        'Docker',
      );
      const database = await startDatabase(options, runId, resources);
      const dbEnv = safeEnvironment({ NODE_ENV: 'test', DATABASE_URL: database.databaseUrl });
      requireSuccess(
        await runCommand(process.execPath, ['--import', 'tsx', 'src/migrate.ts'], {
          cwd: join(root, 'packages/db'),
          env: dbEnv,
        }),
        'Migrations',
      );

      const apiPort = options.ports.api;
      const apiEnv = safeEnvironment({
        NODE_ENV: 'test',
        API_PORT: String(apiPort),
        API_HOST: '127.0.0.1',
        DATABASE_URL: database.databaseUrl,
        BETTER_AUTH_SECRET: randomBytes(32).toString('base64url'),
        BETTER_AUTH_URL: `http://127.0.0.1:${apiPort}`,
        WEB_URL: 'http://localhost:3000',
        EXPO_TRUSTED_ORIGINS: `muvit://,exp://127.0.0.1:${options.ports.metro}`,
        R2_ACCOUNT_ID: 'local-e2e',
        R2_ACCESS_KEY_ID: 'local-e2e',
        R2_SECRET_ACCESS_KEY: 'local-e2e',
        R2_BUCKET: 'local-e2e',
        R2_PUBLIC_URL: 'https://example.invalid/e2e',
        EMAIL_NOTIFICATIONS_ENABLED: 'false',
      });
      const api = startChild(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
        cwd: join(root, 'apps/api'),
        env: apiEnv,
      });
      resources.registerCleanup('api-process', () => stopChild(api));
      resources.registerCleanup('api-log', async () =>
        writeFile(
          join(artifactDir, 'api.log'),
          sanitizeRecursively(api.output(), artifactSecrets),
          'utf8',
        ),
      );
      const apiUrl = `http://127.0.0.1:${apiPort}`;
      await waitForHttp(`${apiUrl}/health`, api);
      if (options.mode === 'android') await startMetro(options, apiUrl, resources, artifactDir);

      for (const scenario of options.scenarios) {
        const outcome = await runScenario(options, scenario, {
          runId,
          apiUrl,
          databaseUrl: database.databaseUrl,
          resources,
          artifacts: artifactDir,
          deviceDate,
          artifactSecrets,
        });
        outcomes.push({
          scenario: outcome.scenario,
          maestroExecuted: outcome.maestroExecuted,
          result: outcome.result,
        });
      }
    });
    report.status = 'passed';
    return report;
  } catch (error) {
    report.error = error instanceof Error ? error.message : 'Falha desconhecida';
    throw error;
  } finally {
    await writeFile(
      join(artifactDir, 'report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
  }
}

function printHelp() {
  process.stdout.write(
    'Uso: node scripts/mobile-e2e.mjs --scenario aluno|professor|isolamento|all --mode android|api-only [--device <serial>] [--avd-name <nome>] [--api-port <porta>] [--metro-port <porta>] [--db-port <porta>] [--artifact-scope <slug>]\n',
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) printHelp();
    else {
      const report = await run(options);
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida no runner E2E';
    process.stderr.write(`${message}\n`);
    process.exitCode =
      typeof error === 'object' &&
      error !== null &&
      'exitCode' in error &&
      typeof error.exitCode === 'number'
        ? error.exitCode
        : 1;
  }
}
