import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  WindowsJobStopError,
  quoteWindowsArgument,
  windowsCommandLine,
} from './web-e2e-windows-job.mjs';
import * as runner from './web-e2e.mjs';
import { assertOwnedContainer, assertPortFree, parseArgs, runStages } from './web-e2e.mjs';

function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

test('valida argumentos antes de criar recursos', () => {
  assert.deepEqual(parseArgs([]), {
    ports: { web: 3013, api: 3353, db: 5453 },
    artifactScope: 'web-e2e',
    headed: false,
    webpack: false,
    production: false,
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

test('usa webpack apenas quando solicitado para iniciar o Next', () => {
  const defaults = parseArgs([]);
  const webpack = parseArgs(['--webpack', '--web-port', '3020']);
  assert.equal(webpack.webpack, true);
  assert.deepEqual(runner.nextDevArgs(defaults).slice(-5), [
    'dev',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3013',
  ]);
  assert.deepEqual(runner.nextDevArgs(webpack).slice(-6), [
    'dev',
    '--webpack',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3020',
  ]);
});

test('executa build e start local de produção apenas quando solicitado', () => {
  const defaults = parseArgs([]);
  const production = parseArgs(['--production', '--web-port', '3021']);
  assert.equal(defaults.production, false);
  assert.equal(production.production, true);
  assert.deepEqual(runner.nextStartArgs(production).slice(-5), [
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3021',
  ]);
});

test('build de produção não reexecuta o prebuild que recompila o runtime compartilhado', () => {
  assert.deepEqual(runner.webBuildArgs(parseArgs(['--production'])), [
    '--dir',
    'apps/web',
    'exec',
    'next',
    'build',
    '--turbopack',
  ]);
  assert.deepEqual(runner.webBuildArgs(parseArgs(['--production', '--webpack'])), [
    '--dir',
    'apps/web',
    'exec',
    'next',
    'build',
    '--webpack',
  ]);
  assert.ok(
    !runner.webBuildArgs(parseArgs(['--production'])).includes('run'),
    'comando de lifecycle run reexecuta prepare:runtime depois que a API iniciou',
  );
});

test('prepara runtime e inicia API antes do build web de produção', async () => {
  const calls = [];
  const stage = (name) => async () => calls.push(name);
  await runStages({
    database: stage('database'),
    migration: stage('migration'),
    api: stage('api'),
    web: stage('web'),
    playwright: stage('playwright'),
  });
  assert.deepEqual(calls, ['database', 'migration', 'api', 'web', 'playwright']);
});

test('isola o distDir de produção por runId e envia o caminho explícito ao Next', () => {
  const first = runner.productionDistDir('aaaa11');
  const second = runner.productionDistDir('bbbb22');
  assert.equal(first, '.next-e2e-aaaa11');
  assert.notEqual(first, second);
  assert.notEqual(runner.distDirAbsolute('aaaa11'), runner.distDirAbsolute('bbbb22'));
  assert.match(runner.distDirAbsolute('aaaa11'), /apps[\\/]web[\\/]\.next-e2e-aaaa11$/);
  assert.throws(() => runner.productionDistDir('../fora'));
  assert.throws(() => runner.productionDistDir('AAAA11'));

  const production = runner.webEnvironment({
    production: true,
    apiUrl: 'http://127.0.0.1:3353',
    distDir: first,
  });
  assert.equal(production.MUVIT_WEB_DIST_DIR, first);
  assert.equal(production.NODE_ENV, 'production');
  const development = runner.webEnvironment({
    production: false,
    apiUrl: 'http://127.0.0.1:3353',
    distDir: null,
  });
  assert.equal(development.MUVIT_WEB_DIST_DIR, runner.developmentDistDir);
  assert.equal(runner.developmentDistDir, '.next');
  assert.equal(development.NODE_ENV, 'development');
  assert.match(runner.generatedNextEnvContent(first), /\.next-e2e-aaaa11\/types\/routes\.d\.ts/);
});

function eligibleJsoncTsConfigFixture() {
  return `{
  // Configuração compartilhada do workspace.
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "plugins": [{ "name": "next" }]
  },
  /* Inclui fontes e tipos gerados. */
  "include": ["next-env.d.ts", "src/**/*"],
  "exclude": ["node_modules"]
}
`;
}

async function writeNextTsConfigDefaults(file, distDir) {
  const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
  const { writeConfigurationDefaults } = requireFromWeb(
    'next/dist/lib/typescript/writeConfigurationDefaults.js',
  );
  const typescript = requireFromWeb('typescript');
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    await writeConfigurationDefaults(typescript.version, file, false, true, distDir, false, false);
  } finally {
    if (previousNodeEnv === undefined) process.env.NODE_ENV = undefined;
    else process.env.NODE_ENV = previousNodeEnv;
  }
}

test('escritor real do Next deixa o tsconfig rastreado inalterado e a restauração confirma', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-web-tsconfig-tracked-'));
  try {
    const file = join(dir, 'tsconfig.json');
    const distDir = runner.productionDistDir('eeee55');
    const before = await readFile(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'tsconfig.json'),
      'utf8',
    );
    // O escritor do Next retorna antes de gravar na presença de extends ou
    // references; o teste falha se o tsconfig rastreado deixar de estender.
    assert.match(before, /"extends"\s*:/, 'tsconfig rastreado sem extends muda a premissa');
    await writeFile(file, before, 'utf8');
    await writeNextTsConfigDefaults(file, distDir);

    const afterWriter = await readFile(file, 'utf8');
    assert.equal(afterWriter, before, 'escritor do Next alterou o tsconfig rastreado');
    const warnings = [];
    const status = await runner.restoreGeneratedWebTsConfig({
      file,
      before,
      distDir,
      onWarning: (message) => warnings.push(message),
    });

    assert.equal(status, 'unchanged');
    assert.equal(await readFile(file, 'utf8'), before);
    assert.deepEqual(warnings, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('preserva edição concorrente de valor no tsconfig rastreado', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-web-tsconfig-concurrent-'));
  try {
    const file = join(dir, 'tsconfig.json');
    const before = await readFile(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'tsconfig.json'),
      'utf8',
    );
    const distDir = runner.productionDistDir('bbbb22');
    const concurrentContent = before.replace('"allowJs": true', '"allowJs": false');
    assert.notEqual(
      concurrentContent,
      before,
      'âncora de edição não encontrada no tsconfig rastreado',
    );
    await writeFile(file, concurrentContent, 'utf8');

    const warnings = [];
    const status = await runner.restoreGeneratedWebTsConfig({
      file,
      before,
      distDir,
      onWarning: (message) => warnings.push(message),
    });

    assert.equal(status, 'preserved');
    assert.equal(await readFile(file, 'utf8'), concurrentContent);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /tsconfig/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('restaura tsconfig JSONC elegível reescrito pelo escritor real do Next', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-web-tsconfig-next-writer-'));
  try {
    const file = join(dir, 'tsconfig.json');
    const distDir = runner.productionDistDir('ffff66');
    const before = eligibleJsoncTsConfigFixture();
    await writeFile(file, before, 'utf8');
    await writeNextTsConfigDefaults(file, distDir);

    const written = await readFile(file, 'utf8');
    assert.notEqual(written, before, 'escritor do Next não reescreveu a fixture elegível');
    assert.ok(written.includes(`${distDir}/types/**/*.ts`));
    assert.ok(written.includes(`${distDir}/dev/types/**/*.ts`));
    assert.match(
      written,
      /Configuração compartilhada do workspace\./,
      'escritor do Next descartou comentário da fixture',
    );
    const warnings = [];
    const status = await runner.restoreGeneratedWebTsConfig({
      file,
      before,
      distDir,
      onWarning: (message) => warnings.push(message),
    });

    assert.equal(status, 'restored');
    assert.equal(await readFile(file, 'utf8'), before);
    assert.deepEqual(warnings, []);
    assert.equal(
      written.includes('.next-e2e-') && (await readFile(file, 'utf8')).includes('.next-e2e-'),
      false,
      'glob por run permaneceu no tsconfig rastreado',
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('preserva tsconfig JSONC com edição concorrente', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-web-tsconfig-jsonc-concurrent-'));
  try {
    const file = join(dir, 'tsconfig.json');
    const distDir = runner.productionDistDir('dddd44');
    const before = `{
  // Configuração compartilhada do workspace.
  "compilerOptions": {
    "strict": false
  },
  "include": ["next-env.d.ts"]
}
`;
    const concurrent = `{
  // Configuração compartilhada do workspace.
  "compilerOptions": {
    "strict": true
  },
  "include": ["next-env.d.ts", "${distDir}/types/**/*.ts", "${distDir}/dev/types/**/*.ts"]
}
`;
    await writeFile(file, concurrent, 'utf8');

    const warnings = [];
    const status = await runner.restoreGeneratedWebTsConfig({
      file,
      before,
      distDir,
      onWarning: (message) => warnings.push(message),
    });

    assert.equal(status, 'preserved');
    assert.equal(await readFile(file, 'utf8'), concurrent);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /tsconfig/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('preserva edição concorrente em comentário antes da primeira leitura da restauração', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-web-tsconfig-comment-edit-'));
  try {
    const file = join(dir, 'tsconfig.json');
    const distDir = runner.productionDistDir('a1b2c3');
    const before = eligibleJsoncTsConfigFixture();
    await writeFile(file, before, 'utf8');
    await writeNextTsConfigDefaults(file, distDir);

    const written = await readFile(file, 'utf8');
    assert.match(
      written,
      /Configuração compartilhada do workspace\./,
      'escritor do Next descartou comentário da fixture',
    );
    const concurrent = written.replace(
      'Configuração compartilhada do workspace.',
      'Configuração editada durante a execução.',
    );
    assert.notEqual(concurrent, written, 'âncora de comentário não encontrada no arquivo do Next');
    await writeFile(file, concurrent, 'utf8');

    const warnings = [];
    const status = await runner.restoreGeneratedWebTsConfig({
      file,
      before,
      distDir,
      onWarning: (message) => warnings.push(message),
    });

    assert.equal(status, 'preserved');
    assert.equal(await readFile(file, 'utf8'), concurrent);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /tsconfig/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('restaura next-env.d.ts somente quando o conteúdo é o gerado conhecido do Next', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-restore-'));
  try {
    const file = join(dir, 'next-env.d.ts');
    const before = runner.generatedNextEnvContent('.next/dev');
    await writeFile(file, before, 'utf8');
    await writeFile(file, runner.generatedNextEnvContent('.next-e2e-aaaa11'), 'utf8');

    const warnings = [];
    const status = await runner.restoreGeneratedNextEnv({
      file,
      before,
      distDir: '.next-e2e-aaaa11',
      onWarning: (message) => warnings.push(message),
    });

    assert.equal(status, 'restored');
    assert.equal(await readFile(file, 'utf8'), before);
    assert.deepEqual(warnings, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('preserva next-env.d.ts com edição concorrente e registra warning', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-preserve-'));
  try {
    const file = join(dir, 'next-env.d.ts');
    const before = runner.generatedNextEnvContent('.next/dev');
    const concurrent = '/// <reference types="next" />\nimport "./edicao-concorrente";\n';
    await writeFile(file, concurrent, 'utf8');

    const warnings = [];
    const status = await runner.restoreGeneratedNextEnv({
      file,
      before,
      distDir: '.next-e2e-aaaa11',
      onWarning: (message) => warnings.push(message),
    });

    assert.equal(status, 'preserved');
    assert.equal(await readFile(file, 'utf8'), concurrent);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /preservado/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('não reescreve next-env.d.ts quando o build não alterou o arquivo', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-unchanged-'));
  try {
    const file = join(dir, 'next-env.d.ts');
    const before = runner.generatedNextEnvContent('.next/dev');
    await writeFile(file, before, 'utf8');

    const warnings = [];
    const status = await runner.restoreGeneratedNextEnv({
      file,
      before,
      distDir: '.next-e2e-aaaa11',
      onWarning: (message) => warnings.push(message),
    });

    assert.equal(status, 'unchanged');
    assert.equal(await readFile(file, 'utf8'), before);
    assert.deepEqual(warnings, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('edição divergente imediatamente antes do replace é preservada', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-atomic-'));
  try {
    const file = join(dir, 'next-env.d.ts');
    const before = runner.generatedNextEnvContent('.next/dev');
    const generated = runner.generatedNextEnvContent('.next-e2e-aaaa11');
    const divergent = '/// <reference types="next" />\nimport "./concorrente";\n';
    await writeFile(file, generated, 'utf8');

    const warnings = [];
    const status = await runner.restoreGeneratedNextEnv({
      file,
      before,
      distDir: '.next-e2e-aaaa11',
      onWarning: (message) => warnings.push(message),
      beforeReplace: async () => {
        await writeFile(file, divergent, 'utf8');
      },
    });

    assert.equal(status, 'preserved');
    assert.equal(await readFile(file, 'utf8'), divergent);
    assert.equal(warnings.length, 1);
    assert.deepEqual(
      (await readdir(dir)).filter((name) => name.includes('.restore-')),
      [],
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('readOptionalFile só trata ENOENT como ausência', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-read-'));
  try {
    assert.equal(await runner.readOptionalFile(join(dir, 'ausente.d.ts')), null);
    const directory = join(dir, 'next-env.d.ts');
    await mkdir(directory);
    await assert.rejects(runner.readOptionalFile(directory), (error) => error.code !== 'ENOENT');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('EACCES na leitura propaga em vez de virar ausência', async () => {
  const denied = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
  await assert.rejects(
    runner.readOptionalFile('inacessivel', async () => {
      throw denied;
    }),
    (error) => error === denied,
  );
});

test('remove conteúdo gerado quando next-env.d.ts não existia antes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-created-'));
  try {
    const file = join(dir, 'next-env.d.ts');
    await writeFile(file, runner.generatedNextEnvContent('.next-e2e-aaaa11'), 'utf8');

    const status = await runner.restoreGeneratedNextEnv({
      file,
      before: null,
      distDir: '.next-e2e-aaaa11',
    });

    assert.equal(status, 'removed');
    await assert.rejects(readFile(file), (error) => error.code === 'ENOENT');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('preserva conteúdo divergente quando next-env.d.ts não existia antes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-created-divergent-'));
  try {
    const file = join(dir, 'next-env.d.ts');
    const divergent = '/// <reference types="next" />\nimport "./concorrente";\n';
    await writeFile(file, divergent, 'utf8');

    const warnings = [];
    const status = await runner.restoreGeneratedNextEnv({
      file,
      before: null,
      distDir: '.next-e2e-aaaa11',
      onWarning: (message) => warnings.push(message),
    });

    assert.equal(status, 'preserved');
    assert.equal(await readFile(file, 'utf8'), divergent);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /preservado/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('serializa captura, build e restauração entre duas execuções concorrentes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-lock-'));
  try {
    const file = join(dir, 'next-env.d.ts');
    const lockFile = join(dir, 'next-env.lock');
    const original = runner.generatedNextEnvContent('.next/dev');
    await writeFile(file, original, 'utf8');
    const seen = [];
    const first = runner.runWithNextEnvLock(
      { lockFile, runId: 'aaaa11', pollMs: 5, timeoutMs: 5000 },
      async () => {
        const before = await runner.readOptionalFile(file);
        seen.push(['first', before]);
        await writeFile(file, runner.generatedNextEnvContent('.next-e2e-aaaa11'), 'utf8');
        await new Promise((done) => setTimeout(done, 150));
        await runner.restoreGeneratedNextEnv({ file, before, distDir: '.next-e2e-aaaa11' });
      },
    );
    let waited = false;
    const second = (async () => {
      await new Promise((done) => setTimeout(done, 20));
      await runner.runWithNextEnvLock(
        {
          lockFile,
          runId: 'bbbb22',
          pollMs: 5,
          timeoutMs: 5000,
          onWait: () => {
            waited = true;
          },
        },
        async () => {
          seen.push(['second', await runner.readOptionalFile(file)]);
        },
      );
    })();
    await Promise.all([first, second]);

    assert.equal(waited, true);
    assert.deepEqual(seen, [
      ['first', original],
      ['second', original],
    ]);
    await assert.rejects(readFile(lockFile), (error) => error.code === 'ENOENT');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('lock ativo de dono conhecido espera e não remove', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-lock-active-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    const record = JSON.stringify({
      owner: 'muvit-web-e2e',
      runId: 'aaaa11',
      pid: 123,
      hostname: 'host-a',
      token: 'token-a',
      createdAt: new Date().toISOString(),
    });
    await writeFile(lockFile, record, 'utf8');

    await assert.rejects(
      runner.acquireNextEnvLock({
        lockFile,
        runId: 'bbbb22',
        timeoutMs: 60,
        pollMs: 10,
        hostname: 'host-a',
        isProcessAlive: () => true,
      }),
      /ativo/,
    );
    assert.equal(await readFile(lockFile, 'utf8'), record);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('interrupção durante a espera do lock aborta sem remover o lock ativo', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-lock-abort-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    const record = JSON.stringify({
      owner: 'muvit-web-e2e',
      runId: 'aaaa11',
      pid: 123,
      hostname: 'host-a',
      token: 'token-a',
      createdAt: new Date().toISOString(),
    });
    await writeFile(lockFile, record, 'utf8');
    const controller = new AbortController();
    const waiting = runner.acquireNextEnvLock({
      lockFile,
      runId: 'bbbb22',
      timeoutMs: 5000,
      pollMs: 20,
      hostname: 'host-a',
      isProcessAlive: () => true,
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(new Error('cancelado')), 50);

    await assert.rejects(waiting, /cancelado/);
    assert.equal(await readFile(lockFile, 'utf8'), record);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('lock stale de dono conhecido é preservado e o timeout é diagnosticado', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-lock-stale-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    const record = JSON.stringify({
      owner: 'muvit-web-e2e',
      runId: 'aaaa11',
      pid: 424242,
      hostname: 'host-a',
      token: 'token-a',
      createdAt: new Date().toISOString(),
    });
    await writeFile(lockFile, record, 'utf8');

    await assert.rejects(
      runner.acquireNextEnvLock({
        lockFile,
        runId: 'bbbb22',
        timeoutMs: 80,
        pollMs: 10,
        hostname: 'host-a',
        isProcessAlive: () => false,
      }),
      (error) =>
        /stale/.test(error.message) &&
        /runId aaaa11/.test(error.message) &&
        /host host-a/.test(error.message) &&
        /pid 424242/.test(error.message) &&
        /manual/.test(error.message),
    );
    assert.equal(await readFile(lockFile, 'utf8'), record);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('lock de dono desconhecido nunca é removido', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-lock-unknown-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    const record = JSON.stringify({ owner: 'outro', runId: 'aaaa11', pid: 1 });
    await writeFile(lockFile, record, 'utf8');

    await assert.rejects(
      runner.acquireNextEnvLock({
        lockFile,
        runId: 'bbbb22',
        timeoutMs: 60,
        pollMs: 10,
        isProcessAlive: () => false,
      }),
      /desconhecido/,
    );
    assert.equal(await readFile(lockFile, 'utf8'), record);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('falha na região protegida libera o lock', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-lock-failure-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    await assert.rejects(
      runner.runWithNextEnvLock({ lockFile, runId: 'aaaa11', timeoutMs: 1000 }, async () => {
        throw new Error('falha simulada');
      }),
      /falha simulada/,
    );
    await assert.rejects(readFile(lockFile), (error) => error.code === 'ENOENT');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('parada não comprovada mantém o lock para inspeção', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-lock-retained-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    const error = new runner.StopNotProvenError('parada não comprovada', { pid: 4242 });
    await assert.rejects(
      runner.runWithNextEnvLock({ lockFile, runId: 'aaaa11', timeoutMs: 1000 }, async () => {
        throw error;
      }),
      (thrown) => thrown === error,
    );
    const record = JSON.parse(await readFile(lockFile, 'utf8'));
    assert.equal(record.runId, 'aaaa11');
    assert.equal(record.pid, process.pid);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('restauração não comprovada mantém o lock para inspeção', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-next-env-restore-retained-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    const error = new runner.RestoreNotProvenError('restauração preservada', {
      status: 'preserved',
    });
    await assert.rejects(
      runner.runWithNextEnvLock({ lockFile, runId: 'aaaa11', timeoutMs: 1000 }, async () => {
        throw error;
      }),
      (thrown) => thrown === error,
    );
    const record = JSON.parse(await readFile(lockFile, 'utf8'));
    assert.equal(record.runId, 'aaaa11');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('falha ao gravar artifact log preserva o erro primário e mantém o lock', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-artifact-log-failure-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    const primary = new runner.StopNotProvenError('parada do build não comprovada', { pid: 4242 });
    const logError = Object.assign(new Error('ENOSPC: no space left on device'), {
      code: 'ENOSPC',
    });
    const failures = [];
    const command = runner.createCommandRunner({
      artifactDir: join(dir, 'artifacts'),
      secrets: ['segredo-sintetico'],
      signal: new AbortController().signal,
      onFailure: (resource, error) => failures.push({ resource, message: error.message }),
      writeLog: async () => {
        throw logError;
      },
      execute: async () => {
        throw primary;
      },
    });
    const retained = [];
    await assert.rejects(
      runner.runWithNextEnvLock(
        {
          lockFile,
          runId: 'aaaa11',
          timeoutMs: 1000,
          onRetained: (error) => retained.push(error),
        },
        async () => command('build', 'pnpm', ['build'], {}),
      ),
      (error) =>
        error === primary && error.artifactLogFailure === logError && error.retainLock === true,
    );
    assert.deepEqual(failures, [{ resource: 'artifact-log-build', message: logError.message }]);
    assert.deepEqual(retained, [primary]);
    const record = JSON.parse(await readFile(lockFile, 'utf8'));
    assert.equal(record.runId, 'aaaa11');
    assert.equal(record.pid, process.pid);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('falha ao gravar report.json preserva a parada não comprovada e mantém o lock', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-report-failure-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    const cause = new WindowsJobStopError('liquidação após leader-exit não concluiu', {
      stage: 'settlement-timeout',
    });
    const primary = new runner.StopNotProvenError('parada do runner não comprovada', {
      pid: 4242,
      cause,
    });
    const writeError = Object.assign(new Error('ENOSPC: no space left on device'), {
      code: 'ENOSPC',
    });
    const report = {
      runId: 'cccc33',
      status: 'failed',
      cleanupErrors: [],
      cleanupWarnings: [],
    };
    await assert.rejects(
      runner.runWithNextEnvLock({ lockFile, runId: 'cccc33', timeoutMs: 1000 }, async () => {
        await runner.finalizeRunReport({
          artifactDir: join(dir, 'artifacts'),
          report,
          primaryError: primary,
          writeReport: async () => {
            throw writeError;
          },
        });
      }),
      (error) =>
        error === primary &&
        error.retainLock === true &&
        error.cause === cause &&
        error.reportWriteFailure === writeError,
    );
    assert.equal(existsSync(lockFile), true, 'lock foi liberado após o erro primário');
    const record = JSON.parse(await readFile(lockFile, 'utf8'));
    assert.equal(record.runId, 'cccc33');
    assert.deepEqual(report.cleanupErrors, [
      { resource: 'report-json', error: writeError.message },
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('falha ao gravar report.json sem erro primário é propagada', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-report-failure-only-'));
  try {
    const writeError = Object.assign(new Error('ENOSPC: no space left on device'), {
      code: 'ENOSPC',
    });
    const report = { runId: 'dddd44', status: 'passed', cleanupErrors: [], cleanupWarnings: [] };
    await assert.rejects(
      runner.finalizeRunReport({
        artifactDir: join(dir, 'artifacts'),
        report,
        writeReport: async () => {
          throw writeError;
        },
      }),
      (error) => error === writeError,
    );
    assert.deepEqual(report.cleanupErrors, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
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

test('falha de limpeza com parada não comprovada preserva retainLock', async () => {
  const noop = async () => {};
  const retained = new runner.StopNotProvenError('limpeza sem prova', { pid: 4242 });
  const failures = [];
  await assert.rejects(
    runStages(
      {
        database: async (resources) =>
          resources.registerCleanup('web', async () => {
            throw retained;
          }),
        migration: noop,
        api: noop,
        web: noop,
        playwright: noop,
      },
      undefined,
      (name, error) => failures.push({ name, error }),
    ),
    (error) => error === retained && error.retainLock === true && error.stopProven === false,
  );
  assert.equal(failures.length, 1);
  assert.equal(failures[0].name, 'web');
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
  'Unix encerra o grupo real spawnado com detached e limpa descendentes',
  { skip: process.platform === 'win32' },
  async () => {
    const { runAbortableCommand } = await import('./web-e2e.mjs');
    const controller = new AbortController();
    let parentPid = 0;
    let descendantPid = 0;
    let cleanupError;
    const childCode = 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)';
    const parentCode = `const { spawn } = require('node:child_process'); const child = spawn(process.execPath, ['-e', ${JSON.stringify(childCode)}]); process.stdout.write(String(child.pid)); setInterval(() => {}, 1000);`;
    try {
      await assert.rejects(
        runAbortableCommand(process.execPath, ['-e', parentCode], {
          signal: controller.signal,
          timeoutMs: 10000,
          detached: true,
          onSpawn: (child) => {
            parentPid = child.pid;
          },
          onOutput: (stdout) => {
            descendantPid = Number(stdout);
            controller.abort(new Error('cancelado'));
          },
        }),
        /cancelado/,
      );
      assert.ok(parentPid > 0);
      assert.ok(descendantPid > 0);
      const end = Date.now() + 3000;
      while ((isAlive(parentPid) || isAlive(descendantPid)) && Date.now() < end)
        await new Promise((done) => setTimeout(done, 50));
      assert.equal(isAlive(parentPid), false, 'líder permaneceu ativo');
      assert.equal(isAlive(descendantPid), false, 'descendente permaneceu ativo');
    } finally {
      if (parentPid) {
        try {
          process.kill(-parentPid, 'SIGKILL');
        } catch {}
      }
      if (descendantPid && isAlive(descendantPid)) {
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

test(
  'Unix encerra o grupo mesmo depois que o líder sai naturalmente',
  { skip: process.platform === 'win32' },
  async () => {
    const descendantCode = 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)';
    const leaderCode = `const { spawn } = require('node:child_process'); const descendant = spawn(process.execPath, ['-e', ${JSON.stringify(descendantCode)}], { stdio: 'ignore' }); process.stdout.write(String(descendant.pid)); setTimeout(() => process.exit(0), 200);`;
    let leader;
    let descendantPid = 0;
    let cleanupError;
    try {
      leader = spawn(process.execPath, ['-e', leaderCode], {
        detached: true,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      descendantPid = await new Promise((resolve, reject) => {
        leader.stdout.once('data', (chunk) => resolve(Number(String(chunk))));
        leader.once('error', reject);
      });
      if (leader.exitCode === null && leader.signalCode === null)
        await new Promise((done) => leader.once('exit', done));
      assert.notEqual(leader.exitCode, null, 'líder não saiu naturalmente');
      assert.equal(isAlive(descendantPid), true, 'descendente não estava vivo no grupo');

      const result = await runner.stopChild(leader);
      assert.equal(result.proven, true);
      assert.equal(isAlive(descendantPid), false, 'descendente permaneceu ativo');
      assert.throws(
        () => process.kill(-leader.pid, 0),
        (error) => error.code === 'ESRCH',
        'grupo ainda existe após a parada',
      );
    } finally {
      if (leader?.pid) {
        try {
          process.kill(-leader.pid, 'SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') cleanupError = error;
        }
      }
      if (descendantPid && isAlive(descendantPid)) {
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

test('stopChild só retorna depois que o processo encerra', async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: process.platform !== 'win32',
  });
  try {
    await new Promise((done) => setTimeout(done, 100));
    if (process.platform === 'linux') {
      const stat = await readFile(`/proc/${child.pid}/stat`, 'utf8');
      const ownGroup = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[2]);
      assert.equal(ownGroup, child.pid, 'filho não iniciou em grupo de processos próprio');
    }
    const result = await runner.stopChild(child);
    assert.equal(result.proven, true);
    assert.equal(result.pid, child.pid);
    if (child.exitCode === null && child.signalCode === null)
      await new Promise((done) => child.once('exit', done));
    assert.notEqual(child.exitCode ?? child.signalCode, null);
    assert.equal(isAlive(child.pid), false, 'processo permaneceu ativo');
    if (process.platform !== 'win32')
      assert.throws(
        () => process.kill(-child.pid, 0),
        (error) => error.code === 'ESRCH',
        'grupo ainda existe após a parada',
      );
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch {}
    }
  }
});

test(
  'Windows encerra pai e descendente vivos e não deixa processo remanescente',
  { skip: process.platform !== 'win32' },
  async () => {
    const childCode = 'setInterval(() => {}, 1000)';
    const parentCode = `const { spawn } = require('node:child_process'); const child = spawn(process.execPath, ['-e', ${JSON.stringify(childCode)}], { stdio: 'ignore' }); process.stdout.write(String(child.pid)); setInterval(() => {}, 1000);`;
    let parent;
    let descendantPid = 0;
    try {
      parent = spawn(process.execPath, ['-e', parentCode], {
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      descendantPid = await new Promise((resolve, reject) => {
        parent.stdout.once('data', (chunk) => resolve(Number(String(chunk))));
        parent.once('error', reject);
      });
      await new Promise((done) => setTimeout(done, 100));
      const result = await runner.stopChild(parent);
      assert.equal(result.proven, true);
      assert.ok(result.pids.includes(parent.pid));
      assert.ok(result.pids.includes(descendantPid));
      assert.equal(isAlive(parent.pid), false);
      assert.equal(isAlive(descendantPid), false);
    } finally {
      for (const pid of [parent?.pid, descendantPid]) {
        if (isAlive(pid)) {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {}
        }
      }
    }
  },
);

test('runAbortableCommand não resolve antes dos descendentes próprios encerrarem no close normal', async () => {
  const descendantCode = 'setInterval(() => {}, 1000)';
  const leaderCode = `const { spawn } = require('node:child_process'); const d = spawn(process.execPath, ['-e', ${JSON.stringify(descendantCode)}], { stdio: 'ignore', detached: ${process.platform === 'win32'} }); d.unref(); process.stdout.write(String(d.pid));`;
  let leaderPid = 0;
  let descendantPid = 0;
  try {
    const run = runner.runAbortableCommand(process.execPath, ['-e', leaderCode], {
      timeoutMs: 10000,
      onSpawn: (child) => {
        leaderPid = child.pid;
      },
      onOutput: (stdout) => {
        const value = Number(stdout.trim());
        if (!descendantPid && Number.isInteger(value) && value > 0) descendantPid = value;
      },
    });
    const settled = await run.then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    assert.ok(leaderPid > 0);
    assert.ok(descendantPid > 0);
    if (process.platform === 'win32') {
      // Sem dono atual do PID do líder não há prova de que o descendente
      // pertence a esta execução: a parada falha fechado e não sinaliza.
      const failure = settled.error;
      assert.equal(failure?.name, 'StopNotProvenError');
      assert.equal(failure.stopProven, false);
      assert.equal(failure.retainLock, true);
      assert.equal(isAlive(descendantPid), true, 'descendente alheio seria sinalizado sem prova');
    } else {
      assert.equal(settled.value.code, 0);
      assert.equal(isAlive(descendantPid), false, 'descendente próprio sobreviveu ao close normal');
    }
  } finally {
    for (const pid of [leaderPid, descendantPid]) {
      if (pid && isAlive(pid)) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {}
      }
    }
  }
});

test(
  'Windows falha fechado após o líder sair naturalmente sem dono atual do PID',
  { skip: process.platform !== 'win32' },
  async () => {
    const childCode = 'setInterval(() => {}, 1000)';
    const parentCode = `const { spawn } = require('node:child_process'); const child = spawn(process.execPath, ['-e', ${JSON.stringify(childCode)}], { stdio: 'ignore', detached: true }); child.unref(); process.stdout.write(String(child.pid)); setTimeout(() => process.exit(0), 150);`;
    let parent;
    let descendantPid = 0;
    try {
      parent = spawn(process.execPath, ['-e', parentCode], {
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      descendantPid = await new Promise((resolve, reject) => {
        parent.stdout.once('data', (chunk) => resolve(Number(String(chunk))));
        parent.once('error', reject);
      });
      if (parent.exitCode === null && parent.signalCode === null)
        await new Promise((done) => parent.once('exit', done));
      assert.notEqual(parent.exitCode, null);
      assert.equal(isAlive(descendantPid), true);

      const failure = await runner.stopChild(parent).catch((error) => error);
      assert.equal(failure.name, 'StopNotProvenError');
      assert.equal(failure.stopProven, false);
      assert.equal(failure.retainLock, true);
      assert.match(failure.message, /prova|comprovad|sinalizad/i);
      assert.equal(isAlive(parent.pid), false);
      assert.equal(isAlive(descendantPid), true, 'órfão sem dono atual foi sinalizado');
    } finally {
      for (const pid of [parent?.pid, descendantPid]) {
        if (isAlive(pid)) {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {}
        }
      }
    }
  },
);

const rootCreatedAt = 638000000000000000n;

for (const [label, nextIdentity] of [
  ['líder sai durante a enumeração', { status: 'gone' }],
  [
    'identidade do líder muda durante a enumeração',
    { status: 'present', createdAt: 638000000000020000n },
  ],
  ['identidade do líder fica incerta durante a enumeração', { status: 'unknown' }],
]) {
  test(`Windows revalida a identidade do líder antes do taskkill: ${label}`, async () => {
    const rootPid = 43001;
    const calls = [];
    let identityReads = 0;
    const failure = await runner
      .stopChild(
        { pid: rootPid, exitCode: null, signalCode: null },
        {
          platform: 'win32',
          timeoutMs: 50,
          readLeaderIdentity: async () => {
            identityReads += 1;
            return identityReads === 1
              ? { status: 'present', createdAt: rootCreatedAt }
              : nextIdentity;
          },
          listDescendants: async () => [],
          isProcessAlive: (pid) => pid === rootPid,
          runCommand: async (binary, args) => {
            calls.push([binary, ...args]);
            return { code: 0, stdout: '', stderr: '' };
          },
          waitExit: async () => false,
          waitPidsGone: async () => false,
        },
      )
      .catch((error) => error);
    assert.ok(identityReads >= 2, 'identidade do líder não foi relida antes de sinalizar');
    assert.deepEqual(
      calls,
      [],
      `taskkill executado com identidade não comprovada: ${JSON.stringify(calls)}`,
    );
    assert.equal(failure.name, 'StopNotProvenError');
    assert.equal(failure.stopProven, false);
    assert.equal(failure.retainLock, true);
    assert.match(failure.message, /líder|identidade|reutilizad/i);
  });
}

test('Windows não sinaliza a árvore quando o líder encerra durante a segunda consulta', async () => {
  const rootPid = 43021;
  const calls = [];
  const leader = { pid: rootPid, exitCode: null, signalCode: null };
  let identityReads = 0;
  const failure = await runner
    .stopChild(leader, {
      platform: 'win32',
      timeoutMs: 50,
      readLeaderIdentity: async () => {
        identityReads += 1;
        if (identityReads === 2) leader.exitCode = 0;
        return { status: 'present', createdAt: rootCreatedAt };
      },
      listDescendants: async () => [],
      isProcessAlive: (pid) => pid === rootPid,
      runCommand: async (binary, args) => {
        calls.push([binary, ...args]);
        return { code: 0, stdout: '', stderr: '' };
      },
      waitExit: async () => true,
      waitPidsGone: async () => true,
    })
    .catch((error) => error);
  assert.equal(identityReads, 2, 'a identidade não foi relida antes de sinalizar');
  assert.deepEqual(calls, [], 'taskkill executado após o líder encerrar durante a consulta');
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  assert.match(failure.message, /líder|encerrou|estado/i);
});

test('Windows não sinaliza a árvore quando o líder deixa de estar vivo na segunda consulta', async () => {
  const rootPid = 43031;
  const calls = [];
  let identityReads = 0;
  let alive = true;
  const failure = await runner
    .stopChild(
      { pid: rootPid, exitCode: null, signalCode: null },
      {
        platform: 'win32',
        timeoutMs: 50,
        readLeaderIdentity: async () => {
          identityReads += 1;
          if (identityReads === 2) alive = false;
          return { status: 'present', createdAt: rootCreatedAt };
        },
        listDescendants: async () => [],
        isProcessAlive: () => alive,
        runCommand: async (binary, args) => {
          calls.push([binary, ...args]);
          return { code: 0, stdout: '', stderr: '' };
        },
        waitExit: async () => true,
        waitPidsGone: async () => true,
      },
    )
    .catch((error) => error);
  assert.equal(identityReads, 2, 'a identidade não foi relida antes de sinalizar');
  assert.deepEqual(calls, [], 'taskkill executado com o líder não comprovadamente vivo');
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  assert.match(failure.message, /líder|vivo|identidade/i);
});

test('Windows não sinaliza quando o líder desaparece na amostragem de liveness', async () => {
  const rootPid = 43071;
  const descendantPid = 43072;
  const calls = [];
  let rootSamples = 0;
  const failure = await runner
    .stopChild(
      { pid: rootPid, exitCode: null, signalCode: null },
      {
        platform: 'win32',
        timeoutMs: 50,
        readLeaderIdentity: async () => ({ status: 'present', createdAt: rootCreatedAt }),
        listDescendants: async () => [{ pid: descendantPid, createdAt: 638000000000000001n }],
        // Vivo nas duas confirmações anteriores ao CIM e ausente exatamente na
        // amostragem de liveness que constrói `alive`, com descendente vivo.
        isProcessAlive: (pid) => {
          if (pid === rootPid) {
            rootSamples += 1;
            return rootSamples <= 2;
          }
          return pid === descendantPid;
        },
        runCommand: async (binary, args) => {
          calls.push([binary, ...args]);
          return { code: 0, stdout: '', stderr: '' };
        },
        waitExit: async () => true,
        waitPidsGone: async () => true,
      },
    )
    .catch((error) => error);
  assert.ok(rootSamples >= 2, 'líder não foi amostrado vivo antes do desaparecimento');
  assert.deepEqual(calls, [], 'taskkill executado com o líder desaparecido na amostragem');
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  assert.match(failure.message, /líder|vivo|liveness|amostragem/i);
});

test('Windows não deixa consulta posterior apagar a ausência do líder na amostragem de liveness', async () => {
  const rootPid = 43101;
  const descendantPid = 43102;
  const calls = [];
  let rootSamples = 0;
  const failure = await runner
    .stopChild(
      { pid: rootPid, exitCode: null, signalCode: null },
      {
        platform: 'win32',
        timeoutMs: 50,
        readLeaderIdentity: async () => ({ status: 'present', createdAt: rootCreatedAt }),
        listDescendants: async () => [{ pid: descendantPid, createdAt: rootCreatedAt }],
        // Vivo nas confirmações anteriores e no CIM, ausente na terceira
        // amostragem (a que constrói `alive`) e presente numa consulta posterior.
        isProcessAlive: (pid) => {
          if (pid === rootPid) {
            rootSamples += 1;
            return rootSamples !== 3;
          }
          return pid === descendantPid;
        },
        runCommand: async (binary, args) => {
          calls.push([binary, ...args]);
          return { code: 0, stdout: '', stderr: '' };
        },
        waitExit: async () => true,
        waitPidsGone: async () => true,
      },
    )
    .catch((error) => error);
  assert.ok(rootSamples >= 3, 'líder não foi amostrado ausente na construção de `alive`');
  assert.deepEqual(calls, [], 'taskkill executado com o líder ausente na amostragem');
  assert.notEqual(
    failure?.proven,
    true,
    'parada declarada provada com o líder ausente na amostragem',
  );
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  assert.match(failure.message, /líder|vivo|liveness|amostragem/i);
});

test('Windows não prova parada quando consulta posterior encontra o líder ausente na amostragem', async () => {
  const rootPid = 43111;
  const calls = [];
  let rootSamples = 0;
  const failure = await runner
    .stopChild(
      { pid: rootPid, exitCode: null, signalCode: null },
      {
        platform: 'win32',
        timeoutMs: 50,
        readLeaderIdentity: async () => ({ status: 'present', createdAt: rootCreatedAt }),
        listDescendants: async () => [],
        // Ausente na terceira amostragem (`alive`) e presente na consulta
        // seguinte: a ausência já observada não pode ser apagada.
        isProcessAlive: (pid) => {
          rootSamples += 1;
          return rootSamples !== 3;
        },
        runCommand: async (binary, args) => {
          calls.push([binary, ...args]);
          return { code: 0, stdout: '', stderr: '' };
        },
        waitExit: async () => true,
        waitPidsGone: async () => true,
      },
    )
    .catch((error) => error);
  assert.ok(rootSamples >= 3, 'líder não foi amostrado ausente na construção de `alive`');
  assert.deepEqual(calls, [], 'taskkill executado com o líder ausente na amostragem');
  assert.notEqual(
    failure?.proven,
    true,
    'parada declarada provada com o líder ausente na amostragem',
  );
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  assert.match(failure.message, /líder|vivo|liveness|amostragem/i);
});

test('Windows mantém o lock quando o líder desaparece na amostragem de liveness', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-liveness-lock-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    const rootPid = 43081;
    const calls = [];
    let rootSamples = 0;
    await assert.rejects(
      runner.runWithNextEnvLock({ lockFile, runId: 'bbbb22', timeoutMs: 1000 }, () =>
        runner.stopChild(
          { pid: rootPid, exitCode: null, signalCode: null },
          {
            platform: 'win32',
            timeoutMs: 50,
            readLeaderIdentity: async () => ({ status: 'present', createdAt: rootCreatedAt }),
            listDescendants: async () => [{ pid: rootPid + 1, createdAt: rootCreatedAt }],
            isProcessAlive: (pid) => {
              if (pid === rootPid) {
                rootSamples += 1;
                return rootSamples <= 2;
              }
              return true;
            },
            runCommand: async (binary, args) => {
              calls.push([binary, ...args]);
              return { code: 0, stdout: '', stderr: '' };
            },
            waitExit: async () => true,
            waitPidsGone: async () => true,
          },
        ),
      ),
      (error) => error.name === 'StopNotProvenError' && error.retainLock === true,
    );
    assert.deepEqual(calls, []);
    const record = JSON.parse(await readFile(lockFile, 'utf8'));
    assert.equal(record.runId, 'bbbb22');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Windows mantém o lock quando consulta posterior apaga a ausência do líder na amostragem', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-liveness-lock-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    const rootPid = 43121;
    const descendantPid = 43122;
    const calls = [];
    let rootSamples = 0;
    await assert.rejects(
      runner.runWithNextEnvLock({ lockFile, runId: 'cccc33', timeoutMs: 1000 }, () =>
        runner.stopChild(
          { pid: rootPid, exitCode: null, signalCode: null },
          {
            platform: 'win32',
            timeoutMs: 50,
            readLeaderIdentity: async () => ({ status: 'present', createdAt: rootCreatedAt }),
            listDescendants: async () => [{ pid: descendantPid, createdAt: rootCreatedAt }],
            isProcessAlive: (pid) => {
              if (pid === rootPid) {
                rootSamples += 1;
                return rootSamples !== 3;
              }
              return pid === descendantPid;
            },
            runCommand: async (binary, args) => {
              calls.push([binary, ...args]);
              return { code: 0, stdout: '', stderr: '' };
            },
            waitExit: async () => true,
            waitPidsGone: async () => true,
          },
        ),
      ),
      (error) => error.name === 'StopNotProvenError' && error.retainLock === true,
    );
    assert.ok(rootSamples >= 3, 'líder não foi amostrado ausente na construção de `alive`');
    assert.deepEqual(calls, [], 'taskkill executado com o líder ausente na amostragem');
    const record = JSON.parse(await readFile(lockFile, 'utf8'));
    assert.equal(record.runId, 'cccc33');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Windows não prova parada quando o líder e a árvore somem na amostragem de liveness', async () => {
  const rootPid = 43091;
  let rootSamples = 0;
  const failure = await runner
    .stopChild(
      { pid: rootPid, exitCode: null, signalCode: null },
      {
        platform: 'win32',
        timeoutMs: 50,
        readLeaderIdentity: async () => ({ status: 'present', createdAt: rootCreatedAt }),
        listDescendants: async () => [],
        isProcessAlive: (pid) => {
          if (pid !== rootPid) return false;
          rootSamples += 1;
          return rootSamples <= 2;
        },
        runCommand: async (binary, args) => {
          throw new Error(`não deveria sinalizar: ${binary} ${args.join(' ')}`);
        },
        waitExit: async () => true,
        waitPidsGone: async () => true,
      },
    )
    .catch((error) => error);
  assert.ok(rootSamples >= 2, 'líder não foi amostrado vivo antes do desaparecimento');
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  assert.match(failure.message, /líder|vivo|liveness|amostragem/i);
});

test('Windows não aceita timestamp divergente dentro da tolerância antiga de 1 ms', async () => {
  const rootPid = 43041;
  const calls = [];
  let identityReads = 0;
  const failure = await runner
    .stopChild(
      { pid: rootPid, exitCode: null, signalCode: null },
      {
        platform: 'win32',
        timeoutMs: 50,
        readLeaderIdentity: async () => {
          identityReads += 1;
          return {
            status: 'present',
            createdAt: identityReads === 1 ? rootCreatedAt : rootCreatedAt + 5000n,
          };
        },
        listDescendants: async () => [],
        isProcessAlive: (pid) => pid === rootPid,
        runCommand: async (binary, args) => {
          calls.push([binary, ...args]);
          return { code: 0, stdout: '', stderr: '' };
        },
        waitExit: async () => true,
        waitPidsGone: async () => true,
      },
    )
    .catch((error) => error);
  assert.equal(identityReads, 2, 'a identidade não foi relida antes de sinalizar');
  assert.deepEqual(calls, [], 'taskkill executado com criação divergente do snapshot');
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  assert.match(failure.message, /identidade/i);
});

test('Windows exige código 0 do taskkill mesmo quando os PIDs somem depois', async () => {
  const rootPid = 43051;
  const calls = [];
  let alive = true;
  const failure = await runner
    .stopChild(
      { pid: rootPid, exitCode: null, signalCode: null },
      {
        platform: 'win32',
        timeoutMs: 50,
        readLeaderIdentity: async () => ({ status: 'present', createdAt: rootCreatedAt }),
        listDescendants: async () => [],
        isProcessAlive: () => alive,
        runCommand: async (binary, args) => {
          calls.push([binary, ...args]);
          alive = false;
          return { code: 1, stdout: '', stderr: 'acesso negado' };
        },
        waitExit: async () => true,
        waitPidsGone: async () => true,
      },
    )
    .catch((error) => error);
  assert.deepEqual(calls, [['taskkill.exe', '/PID', String(rootPid), '/T', '/F']]);
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  assert.match(failure.message, /taskkill|código 1/i);
});

test('Windows prova a parada quando o taskkill retorna código 0', async () => {
  const rootPid = 43061;
  const calls = [];
  let alive = true;
  const result = await runner.stopChild(
    { pid: rootPid, exitCode: null, signalCode: null },
    {
      platform: 'win32',
      timeoutMs: 50,
      readLeaderIdentity: async () => ({ status: 'present', createdAt: rootCreatedAt }),
      listDescendants: async () => [],
      isProcessAlive: () => alive,
      runCommand: async (binary, args) => {
        calls.push([binary, ...args]);
        alive = false;
        return { code: 0, stdout: '', stderr: '' };
      },
      waitExit: async () => true,
      waitPidsGone: async () => true,
    },
  );
  assert.equal(result.proven, true);
  assert.deepEqual(calls, [['taskkill.exe', '/PID', String(rootPid), '/T', '/F']]);
});

test('Windows não sinaliza depois de esgotar o orçamento único de parada', async () => {
  const rootPid = 43062;
  const calls = [];
  let clock = 0;
  const failure = await runner
    .stopChild(
      { pid: rootPid, exitCode: null, signalCode: null },
      {
        platform: 'win32',
        timeoutMs: 100,
        now: () => clock,
        readLeaderIdentity: async () => {
          clock += 40;
          return { status: 'present', createdAt: rootCreatedAt };
        },
        listDescendants: async () => {
          clock += 40;
          return [];
        },
        isProcessAlive: (pid) => pid === rootPid,
        runCommand: async (binary, args) => {
          calls.push([binary, ...args]);
          return { code: 0, stdout: '', stderr: '' };
        },
        waitExit: async () => true,
        waitPidsGone: async () => true,
      },
    )
    .catch((error) => error);
  assert.deepEqual(calls, [], 'taskkill executado após o orçamento de parada esgotar');
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  assert.match(failure.message, /orçamento|prazo|tempo/i);
});

test('Windows mantém o lock quando o orçamento de parada esgota antes do taskkill', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-stop-budget-lock-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    const rootPid = 43063;
    const calls = [];
    let clock = 0;
    await assert.rejects(
      runner.runWithNextEnvLock({ lockFile, runId: 'eeee55', timeoutMs: 1000 }, () =>
        runner.stopChild(
          { pid: rootPid, exitCode: null, signalCode: null },
          {
            platform: 'win32',
            timeoutMs: 100,
            now: () => clock,
            readLeaderIdentity: async () => {
              clock += 40;
              return { status: 'present', createdAt: rootCreatedAt };
            },
            listDescendants: async () => {
              clock += 40;
              return [];
            },
            isProcessAlive: (pid) => pid === rootPid,
            runCommand: async (binary, args) => {
              calls.push([binary, ...args]);
              return { code: 0, stdout: '', stderr: '' };
            },
            waitExit: async () => true,
            waitPidsGone: async () => true,
          },
        ),
      ),
      (error) =>
        error.name === 'StopNotProvenError' &&
        error.retainLock === true &&
        /orçamento|prazo|tempo/i.test(error.message),
    );
    assert.deepEqual(calls, [], 'taskkill executado após o orçamento de parada esgotar');
    const record = JSON.parse(await readFile(lockFile, 'utf8'));
    assert.equal(record.runId, 'eeee55');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Windows mantém o lock quando a identidade do líder muda antes do taskkill', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'muvit-leader-identity-lock-'));
  try {
    const lockFile = join(dir, 'next-env.lock');
    const rootPid = 43011;
    const calls = [];
    let identityReads = 0;
    let rootAlive = true;
    await assert.rejects(
      runner.runWithNextEnvLock({ lockFile, runId: 'aaaa11', timeoutMs: 1000 }, () =>
        runner.stopChild(
          { pid: rootPid, exitCode: null, signalCode: null },
          {
            platform: 'win32',
            timeoutMs: 50,
            readLeaderIdentity: async () => {
              identityReads += 1;
              return identityReads === 1
                ? { status: 'present', createdAt: rootCreatedAt }
                : { status: 'present', createdAt: 638000000000020000n };
            },
            listDescendants: async () => [],
            isProcessAlive: (pid) => (pid === rootPid ? rootAlive : false),
            runCommand: async (binary, args) => {
              calls.push([binary, ...args]);
              rootAlive = false;
              return { code: 0, stdout: '', stderr: '' };
            },
            waitExit: async () => true,
            waitPidsGone: async () => true,
          },
        ),
      ),
      (error) => error.name === 'StopNotProvenError' && error.retainLock === true,
    );
    assert.deepEqual(calls, []);
    const record = JSON.parse(await readFile(lockFile, 'utf8'));
    assert.equal(record.runId, 'aaaa11');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Windows representa descendente CIM com CreationDate nulo como identidade desconhecida', async () => {
  const parsed = await runner.listWindowsDescendants(44001, 50, async () => ({
    code: 0,
    stdout: '44002 unknown\n',
    stderr: '',
  }));
  assert.deepEqual(parsed, [{ pid: 44002, createdAt: null }]);
});

test(
  'Windows enumera CIM real com CreationDate nulo como identidade desconhecida',
  { skip: process.platform !== 'win32' },
  async () => {
    const fakeCim = `function Get-CimInstance { param($ClassName, $Filter, $ErrorAction) if ($Filter -eq 'ParentProcessId=44001') { [pscustomobject]@{ ProcessId = 44002; CreationDate = $null } } }
`;
    const parsed = await runner.listWindowsDescendants(
      44001,
      5000,
      async (_binary, args) =>
        new Promise((resolve, reject) => {
          const child = spawn(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-Command', `${fakeCim}${args.at(-1)}`],
            { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
          );
          let stdout = '';
          let stderr = '';
          child.stdout.setEncoding('utf8');
          child.stderr.setEncoding('utf8');
          child.stdout.on('data', (chunk) => {
            stdout += chunk;
          });
          child.stderr.on('data', (chunk) => {
            stderr += chunk;
          });
          child.once('error', reject);
          child.once('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
        }),
    );
    assert.deepEqual(parsed, [{ pid: 44002, createdAt: null }]);
  },
);

test('Windows falha fechado sem sinalizar qualquer órfão vivo quando o líder já terminou', async () => {
  const rootPid = 47011;
  const ownerCreatedAt = 638000000000020000n;
  const descendants = [
    { pid: 47012, createdAt: ownerCreatedAt - 5000n },
    { pid: 47013, createdAt: ownerCreatedAt },
    { pid: 47014, createdAt: ownerCreatedAt + 1000n },
    { pid: 47015, createdAt: null },
  ];
  const signals = [];
  const failure = await runner
    .stopChild(
      { pid: rootPid, exitCode: 0, signalCode: null },
      {
        platform: 'win32',
        timeoutMs: 50,
        readLeaderIdentity: async () => ({ status: 'present', createdAt: ownerCreatedAt }),
        listDescendants: async () => descendants,
        isProcessAlive: (pid) => descendants.some((entry) => entry.pid === pid),
        runCommand: async (binary, args) => {
          signals.push([binary, ...args]);
          return { code: 0, stdout: '', stderr: '' };
        },
        waitExit: async () => true,
        waitPidsGone: async () => true,
      },
    )
    .catch((error) => error);
  assert.deepEqual(signals, [], 'sinal enviado sem prova de associação');
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  for (const entry of descendants) assert.match(failure.message, new RegExp(String(entry.pid)));
});

for (const [label, ownerIdentity] of [
  ['não tem dono atual', { status: 'gone' }],
  ['tem identidade desconhecida', { status: 'unknown' }],
  ['tem status inesperado', { status: 'reused' }],
  ['não informa criação', { status: 'present' }],
  ['informa criação inválida', { status: 'present', createdAt: 0n }],
  ['informa criação não numérica', { status: 'present', createdAt: '638000000000020000' }],
]) {
  test(`Windows falha fechado com órfão vivo quando o dono atual do PID do líder ${label}`, async () => {
    const rootPid = 47101;
    const descendantPid = 47102;
    const signals = [];
    const failure = await runner
      .stopChild(
        { pid: rootPid, exitCode: 0, signalCode: null },
        {
          platform: 'win32',
          timeoutMs: 50,
          readLeaderIdentity: async () => ownerIdentity,
          listDescendants: async () => [{ pid: descendantPid, createdAt: 638000000000000001n }],
          isProcessAlive: (pid) => pid === descendantPid,
          runCommand: async (binary, args) => {
            signals.push([binary, ...args]);
            return { code: 0, stdout: '', stderr: '' };
          },
          waitExit: async () => true,
          waitPidsGone: async () => true,
        },
      )
      .catch((error) => error);
    assert.deepEqual(
      signals,
      [],
      `sinal enviado com dono ${String(ownerIdentity.status)} (${String(ownerIdentity.createdAt)})`,
    );
    assert.equal(failure.name, 'StopNotProvenError');
    assert.equal(failure.stopProven, false);
    assert.equal(failure.retainLock, true);
    assert.match(failure.message, /prova|comprovad|sinalizad/i);
  });
}

test('Windows não prova parada nem sinaliza descendente CIM sem CreationDate ainda vivo', async () => {
  const rootPid = 45001;
  const descendantPid = 45002;
  const calls = [];
  const failure = await runner
    .stopChild(
      { pid: rootPid, exitCode: 0, signalCode: null },
      {
        platform: 'win32',
        timeoutMs: 50,
        listDescendants: async () => [{ pid: descendantPid, createdAt: null }],
        isProcessAlive: (pid) => pid === descendantPid,
        runCommand: async (binary, args) => {
          calls.push([binary, ...args]);
          return { code: 0, stdout: '', stderr: '' };
        },
        waitExit: async () => true,
        waitPidsGone: async () => false,
      },
    )
    .catch((error) => error);
  assert.deepEqual(calls, [], 'processo de identidade desconhecida foi sinalizado');
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  assert.match(failure.message, /prova|identidade|comprovad/i);
});

test('Windows considera encerrado descendente CIM sem CreationDate que comprovadamente sumiu', async () => {
  const rootPid = 46001;
  const descendantPid = 46002;
  const calls = [];
  const result = await runner.stopChild(
    { pid: rootPid, exitCode: 0, signalCode: null },
    {
      platform: 'win32',
      timeoutMs: 50,
      listDescendants: async () => [{ pid: descendantPid, createdAt: null }],
      isProcessAlive: () => false,
      runCommand: async (binary, args) => {
        calls.push([binary, ...args]);
        return { code: 0, stdout: '', stderr: '' };
      },
      waitExit: async () => true,
      waitPidsGone: async () => true,
    },
  );
  assert.equal(result.proven, true);
  assert.ok(result.pids.includes(descendantPid));
  assert.deepEqual(calls, []);
});

test('Windows encerra a árvore uma única vez e não repete taskkill em PID reutilizado', async () => {
  const rootPid = 41001;
  const descendantPid = 41002;
  const calls = [];
  let rootAlive = true;
  let descendantAlive = true;
  const failure = await runner
    .stopChild(
      { pid: rootPid, exitCode: null, signalCode: null },
      {
        platform: 'win32',
        timeoutMs: 50,
        readLeaderIdentity: async () => ({ status: 'present', createdAt: rootCreatedAt }),
        listDescendants: async () => [{ pid: descendantPid, createdAt: 638000000000000000n }],
        isProcessAlive: (pid) =>
          pid === rootPid ? rootAlive : pid === descendantPid ? descendantAlive : false,
        runCommand: async (binary, args) => {
          calls.push([binary, ...args]);
          if (args[1] === String(rootPid)) {
            // /T encerra a árvore; o PID do descendente é reutilizado por um
            // processo alheio logo depois do primeiro taskkill.
            rootAlive = false;
            descendantAlive = false;
          } else {
            descendantAlive = true;
          }
          return { code: 0, stdout: '', stderr: '' };
        },
        waitExit: async () => true,
        waitPidsGone: async () => false,
      },
    )
    .catch((error) => error);
  assert.equal(calls.length, 1, `taskkill repetido: ${JSON.stringify(calls)}`);
  assert.deepEqual(calls[0], ['taskkill.exe', '/PID', String(rootPid), '/T', '/F']);
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.stopProven, false);
  assert.equal(failure.retainLock, true);
  assert.match(failure.message, /remanescentes/i);
});

test('Windows não sinaliza descendente vivo quando o líder já terminou mesmo com identidade presente', async () => {
  const rootPid = 42001;
  const descendantPid = 42002;
  const calls = [];
  const failure = await runner
    .stopChild(
      { pid: rootPid, exitCode: 0, signalCode: null },
      {
        platform: 'win32',
        timeoutMs: 50,
        listDescendants: async () => [{ pid: descendantPid, createdAt: 638000000000000001n }],
        isProcessAlive: (pid) => pid === descendantPid,
        runCommand: async (binary, args) => {
          calls.push([binary, ...args]);
          return { code: 0, stdout: '', stderr: '' };
        },
        waitExit: async () => true,
        waitPidsGone: async () => false,
      },
    )
    .catch((error) => error);
  assert.deepEqual(calls, [], 'taskkill por PID não comprovado');
  assert.equal(failure.name, 'StopNotProvenError');
  assert.equal(failure.retainLock, true);
  assert.match(failure.message, /prova|identidade|comprovad/i);
});

test('falha de parada do subprocesso vira StopNotProvenError', async () => {
  let pid;
  try {
    await assert.rejects(
      runner.runAbortableCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
        timeoutMs: 300,
        stopChild: async (child) => {
          pid = child.pid;
          throw new Error('parada simulada falhou');
        },
      }),
      (error) =>
        error.name === 'StopNotProvenError' &&
        error.stopProven === false &&
        error.retainLock === true &&
        error.pid === pid &&
        /parada simulada falhou/.test(error.message),
    );
  } finally {
    if (pid) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
  }
});

test('timeout ao encerrar subprocesso vira StopNotProvenError', async () => {
  let pid;
  try {
    await assert.rejects(
      runner.runAbortableCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
        timeoutMs: 300,
        stopTimeoutMs: 100,
        stopChild: (child) => {
          pid = child.pid;
          return new Promise(() => {});
        },
      }),
      (error) =>
        error.name === 'StopNotProvenError' &&
        error.stopProven === false &&
        /Tempo limite ao encerrar subprocesso/.test(error.message),
    );
  } finally {
    if (pid) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
  }
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

test('quoting Windows preserva vazio, espaços, aspas e barras finais', () => {
  assert.equal(quoteWindowsArgument(''), '""');
  assert.equal(quoteWindowsArgument('simples'), 'simples');
  assert.equal(quoteWindowsArgument('a b'), '"a b"');
  assert.equal(quoteWindowsArgument('a"b'), '"a\\"b"');
  assert.equal(quoteWindowsArgument('a\\'), 'a\\');
  assert.equal(quoteWindowsArgument('a b\\'), '"a b\\\\"');
  assert.equal(windowsCommandLine('C:\\x\\node.exe', ['a b'], {}), 'C:\\x\\node.exe "a b"');
  assert.equal(
    windowsCommandLine('cmd.exe', ['/d', '/s', '/c', '"x y"'], {
      windowsVerbatimArguments: true,
    }),
    'cmd.exe /d /s /c "x y"',
  );
});

test('stopChild converte falha do Job Object em parada não comprovada', async () => {
  const proven = await runner.stopChild({
    isWindowsJob: true,
    pid: 11,
    stop: async () => ({ proven: true, pid: 11 }),
  });
  assert.deepEqual(proven, { proven: true, pid: 11, pids: [11] });
  await assert.rejects(
    runner.stopChild({
      isWindowsJob: true,
      pid: 12,
      stop: async () => {
        throw new Error('sem prova de ActiveProcesses=0');
      },
    }),
    (error) =>
      error.name === 'StopNotProvenError' &&
      error.retainLock === true &&
      /sem prova/.test(error.message),
  );
  assert.equal(new WindowsJobStopError('prazo', { stage: 'stop-timeout' }).retainLock, true);
});

test(
  'falha pré-pipes chega ao log de build sanitizada e sem env',
  { skip: process.platform !== 'win32' },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'muvit-build-log-'));
    const brokenSupervisor = join(dir, 'supervisor-diagnostico.ps1');
    const secret = 'segredo-do-log-de-build-654';
    await writeFile(
      brokenSupervisor,
      [
        "[Console]::Error.WriteLine('diagnostico inofensivo: Add-Type falhou no build')",
        "[Console]::Error.WriteLine('MUVIT_WEB_E2E_JOB_TOKEN=' + $env:MUVIT_WEB_E2E_JOB_TOKEN)",
        'exit 3',
        '',
      ].join('\n'),
      'utf8',
    );
    try {
      const error = await runner
        .runAbortableCommand(process.execPath, ['-e', 'process.exit(0)'], {
          env: Object.fromEntries(
            Object.entries(process.env).filter(([key]) => !key.includes('=')),
          ),
          windowsJob: true,
          supervisorScript: brokenSupervisor,
          startupTimeoutMs: 15000,
          timeoutMs: 20000,
        })
        .catch((failure) => failure);
      assert.equal(error.name, 'StopNotProvenError');
      assert.match(error.message, /diagnostico inofensivo: Add-Type falhou no build/);
      assert.match(
        error.diagnostic ?? error.output,
        /diagnostico inofensivo: Add-Type falhou no build/,
      );
      assert.equal((error.diagnostic ?? error.output).includes('MUVIT_WEB_E2E_JOB_'), false);
      await runner.writeCommandArtifactLog(
        dir,
        'build',
        `${error.message}\n${error.diagnostic ?? error.output}\n${secret}`,
        [secret],
      );
      const log = await readFile(join(dir, 'build.log'), 'utf8');
      assert.match(log, /diagnostico inofensivo: Add-Type falhou no build/);
      assert.equal(log.includes(secret), false, 'log de build expôs segredo');
      assert.equal(log.includes('MUVIT_WEB_E2E_JOB_'), false, 'log de build expôs env');
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  },
);
