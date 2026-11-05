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

test('usa development build e expande confirmação na suíte Android', async () => {
  const { parseArgs, metroArguments } = await runnerModule();
  const options = parseArgs([
    '--scenario',
    'all',
    '--mode',
    'android',
    '--device',
    'emulator-5554',
  ]);
  assert.equal(options.appId, 'com.anonymous.muvit');
  assert.match(options.launchUrl, /^exp\+muvit:\/\/expo-development-client\//);
  assert.ok(options.scenarios.includes('confirmacao-email'));
  assert.ok(metroArguments(8094).includes('--dev-client'));
  assert.ok(!metroArguments(8094).includes('--go'));
  assert.throws(() =>
    parseArgs([
      '--scenario',
      'aluno',
      '--mode',
      'android',
      '--device',
      'emulator-5554',
      '--launch-url',
      'exp://localhost:8094',
    ]),
  );
});

test('fluxos aguardam launcher, login ou diálogo antes de abrir o link do servidor', async () => {
  for (const flow of ['login.yaml', 'confirmacao-email.yaml']) {
    const content = await readFile(join('.maestro', 'mobile', flow), 'utf8');
    assert.match(
      content,
      /- launchApp\s+- extendedWaitUntil:\s+visible: "DEVELOPMENT SERVERS\|Continue\|Connected to expo-cli\|Muvit needs permissions\.\*\|Entrar"\s+timeout: \d+\s+- openLink: \$\{MAESTRO_EXPO_URL\}/,
      `${flow} deve aguardar a inicialização do client antes de enviar o link`,
    );
  }
});

test('fluxos aguardam a tela ou o diálogo nativo antes de tratar overlays e exigir login', async () => {
  for (const flow of ['login.yaml', 'confirmacao-email.yaml']) {
    const content = await readFile(join('.maestro', 'mobile', flow), 'utf8');
    assert.match(
      content,
      /- openLink: \$\{MAESTRO_EXPO_URL\}\s+- extendedWaitUntil:\s+visible: "Continue\|Connected to expo-cli\|Muvit needs permissions\.\*\|Entrar"\s+timeout: 120000\s+- runFlow: expo-overlays\.yaml\s+- extendedWaitUntil:\s+visible: Entrar\s+timeout: 120000/,
      `${flow} deve esperar a interface carregar antes de tratar overlays e exigir login`,
    );
  }
});

test('confirmação Android executa UI, confirma e retorna à UI na ordem', async () => {
  const { runVerificationScenario } = await runnerModule();
  const calls = [];
  const result = await runVerificationScenario(
    { mode: 'android' },
    { runId: 'aabbcc', artifacts: 'unused', artifactSecrets: [] },
    {
      runFlow: async (flow) => calls.push(flow),
      confirm: async () => calls.push('confirmar'),
    },
  );
  assert.deepEqual(calls, ['confirmacao-email', 'confirmar', 'confirmar-email-link']);
  assert.equal(result.maestroExecuted, true);
});

test('confirmação recusa link de origem alheia antes de fazer requisição', async () => {
  const { runVerificationScenario } = await runnerModule();
  const originalFetch = globalThis.fetch;
  let requested = false;
  globalThis.fetch = async () => {
    requested = true;
    throw new Error('não deveria chamar');
  };
  try {
    await assert.rejects(
      runVerificationScenario(
        { mode: 'android' },
        {
          runId: 'aabbcc',
          apiUrl: 'http://127.0.0.1:3344',
          artifacts: 'unused',
          artifactSecrets: [],
          mailbox: { take: () => 'https://externo.invalid/api/auth/verify-email?token=abc' },
        },
        { runFlow: async () => {} },
      ),
      /Link de confirmação E2E inválido/,
    );
    assert.equal(requested, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('confirmação aceita retorno nativo sem expor o token no resultado', async () => {
  const { runVerificationScenario } = await runnerModule();
  const previous = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.redirect, 'manual');
    return new Response(null, { status: 302, headers: { location: 'muvit://verify-email' } });
  };
  try {
    const result = await runVerificationScenario(
      { mode: 'android' },
      {
        runId: 'aabbcc',
        apiUrl: 'http://127.0.0.1:3344',
        artifacts: 'unused',
        artifactSecrets: [],
        mailbox: { take: () => 'http://127.0.0.1:3344/api/auth/verify-email?token=segredo' },
      },
      { runFlow: async () => {} },
    );
    assert.equal(result.result.confirmed, true);
    assert.doesNotMatch(JSON.stringify(result), /segredo/);
  } finally {
    globalThis.fetch = previous;
  }
});
