import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

async function runnerModule() {
  return import('./mobile-e2e.mjs');
}

test('expande all nos três cenários suportados', async () => {
  const { parseArgs } = await runnerModule();
  const options = parseArgs(['--scenario', 'all', '--mode', 'api-only']);

  assert.deepEqual(options.scenarios, ['aluno', 'professor', 'isolamento']);
  assert.equal(options.mode, 'api-only');
});

test('exige serial explícito antes de criar qualquer recurso Android', async () => {
  const { parseArgs } = await runnerModule();

  assert.throws(
    () => parseArgs(['--scenario', 'aluno', '--mode', 'android']),
    /--device.*obrigat/i,
  );
});

test('api-only dispensa serial Android', async () => {
  const { parseArgs } = await runnerModule();
  const options = parseArgs(['--scenario', 'aluno', '--mode', 'api-only']);

  assert.equal(options.device, undefined);
});

test('isolamento Android executa UI antes das negações HTTP com as mesmas identidades', async () => {
  const { runScenario } = await runnerModule();
  const calls = [];
  let preparedCredentials;
  const outcome = await runScenario(
    { mode: 'android' },
    'isolamento',
    {
      runId: 'a1b2c3d4e5f6',
      apiUrl: 'http://127.0.0.1:3344',
      databaseUrl: 'postgresql://localhost/e2e_test',
      artifacts: '/unused',
      deviceDate: '2026-10-21',
    },
    {
      invokeFixture: async (_url, _runId, _scenario, action, _secrets, extra) => {
        calls.push(action);
        if (action === 'prepare') {
          preparedCredentials = extra.credentialsEnv.E2E_CREDENTIALS;
          return { manifest: { scenario: 'isolamento' } };
        }
        assert.equal(extra.credentialsEnv.E2E_CREDENTIALS, preparedCredentials);
        return { result: { ownerStateIntact: true } };
      },
      runMaestro: async () => {
        calls.push('maestro');
      },
    },
  );
  assert.deepEqual(calls, ['prepare', 'maestro', 'isolation']);
  assert.equal(outcome.maestroExecuted, true);
  assert.equal(outcome.result.result.ownerStateIntact, true);
});

test('rejeita portas duplicadas e inválidas', async () => {
  const { parseArgs } = await runnerModule();

  assert.throws(
    () =>
      parseArgs([
        '--scenario',
        'all',
        '--mode',
        'api-only',
        '--api-port',
        '5444',
        '--db-port',
        '5444',
      ]),
    /portas.*distintas/i,
  );
  assert.throws(
    () => parseArgs(['--scenario', 'all', '--mode', 'api-only', '--api-port', '70000']),
    /porta.*inválida/i,
  );
});

test('recusa registrar um container que não pertence ao run', async () => {
  const { assertOwnedContainer, containerNameForRun } = await runnerModule();
  const runId = 'a1b2c3d4e5f6';
  const expected = containerNameForRun(runId);

  assert.equal(expected, `muvit_mobile_e2e_${runId}_test`);
  assert.throws(
    () => assertOwnedContainer({ name: 'postgres', runId, owner: 'muvit-mobile-e2e' }, runId),
    /container.*run/i,
  );
});

test('preserva exit code não zero e limpa somente recursos registrados', async () => {
  const { runWithResources, runCommand } = await runnerModule();
  const cleaned = [];

  await assert.rejects(
    runWithResources(async (resources) => {
      resources.registerCleanup('owned-container', async () => cleaned.push('owned-container'));
      const result = await runCommand(process.execPath, ['-e', 'process.exit(23)']);
      assert.equal(result.code, 23);
      if (result.code !== 0) {
        const error = new Error('processo terminou com erro');
        error.exitCode = result.code;
        throw error;
      }
    }),
    (error) => error.exitCode === 23,
  );

  assert.deepEqual(cleaned, ['owned-container']);
});

test('sanitiza credenciais recursivamente em JSON do Maestro', async () => {
  const { sanitizeRecursively } = await runnerModule();
  const value = {
    output: [
      { inputText: 'senha_super_secreta' },
      { nested: { text: 'E2E_STUDENT_EMAIL=aluno@muvit.invalid' } },
    ],
  };

  assert.deepEqual(sanitizeRecursively(value, ['senha_super_secreta', 'aluno@muvit.invalid']), {
    output: [{ inputText: '[REDACTED]' }, { nested: { text: 'E2E_STUDENT_EMAIL=[REDACTED]' } }],
  });
});

test('suíte tem defaults permanentes e aceita AVD e escopo de evidência explícitos', async () => {
  const { parseArgs } = await runnerModule();
  const defaults = parseArgs(['--scenario', 'all', '--device', 'emulator-1234']);
  assert.equal(defaults.mode, 'android');
  assert.equal(defaults.avdName, 'muvit-mobile-e2e');
  assert.equal(defaults.artifactScope, 'mobile-e2e');
  const custom = parseArgs([
    '--scenario',
    'aluno',
    '--mode',
    'api-only',
    '--avd-name',
    'avd-own',
    '--artifact-scope',
    'qa-own',
  ]);
  assert.equal(custom.avdName, 'avd-own');
  assert.equal(custom.artifactScope, 'qa-own');
  assert.throws(
    () =>
      parseArgs(['--scenario', 'aluno', '--mode', 'api-only', '--artifact-scope', '../outside']),
    /artifact-scope/,
  );
});

test('sanitiza arquivos aninhados do Maestro preservando imagens', async () => {
  const { sanitizeArtifactFiles } = await runnerModule();
  const directory = await mkdtemp(join(tmpdir(), 'mobile-e2e-redaction-'));
  try {
    await mkdir(join(directory, 'logs'));
    await writeFile(join(directory, 'logs', 'commands.json'), '{"text":"ephemeral-password"}');
    const image = Buffer.from([0, 255, 4, 9]);
    await writeFile(join(directory, 'screen.png'), image);
    await sanitizeArtifactFiles(directory, ['ephemeral-password']);
    assert.equal(
      await readFile(join(directory, 'logs', 'commands.json'), 'utf8'),
      '{"text":"[REDACTED]"}',
    );
    assert.deepEqual(await readFile(join(directory, 'screen.png')), image);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test(
  'executa batch Windows em caminho com espaços preservando o exit code',
  { skip: process.platform !== 'win32' },
  async () => {
    const { runCommand } = await runnerModule();
    const directory = await mkdtemp(join(tmpdir(), 'mobile-e2e-batch-'));
    try {
      const batch = join(directory, 'exit code.cmd');
      await writeFile(batch, '@exit /b 23\r\n');
      const result = await runCommand(batch, []);
      assert.equal(result.code, 23, result.stderr);
    } finally {
      await rm(directory, { recursive: true });
    }
  },
);
