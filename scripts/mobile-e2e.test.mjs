import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

async function runnerModule() {
  return import('./mobile-e2e.mjs');
}

async function assessmentFlow() {
  return readFile(join('.maestro', 'mobile', 'avaliacoes-empatadas.yaml'), 'utf8');
}

async function professorFlow() {
  return readFile(join('.maestro', 'mobile', 'professor.yaml'), 'utf8');
}

function escapedPattern(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Rolagem crítica pós-Back: repeat limitado, swipe em percentuais dentro do ScrollView
// (gutter esquerdo, fora dos TextInputs) e confirmação explícita do alvo.
function criticalScroll(content, target) {
  const escaped = escapedPattern(target);
  const pattern = new RegExp(
    [
      '- pressKey: Back',
      '- repeat:',
      'times: (?<times>\\d+)',
      'while:',
      `notVisible: ${escaped}`,
      'commands:',
      '- swipe:',
      'start: (?<startX>\\d+)%, (?<startY>\\d+)%',
      'end: (?<endX>\\d+)%, (?<endY>\\d+)%',
      'duration: (?<duration>\\d+)',
      `- assertVisible: ${escaped}`,
      `- tapOn: ${escaped}`,
    ].join('\\s+'),
  );
  const match = pattern.exec(content);

  assert.ok(
    match,
    `rolagem até "${target}" deve dispensar o teclado, repetir de forma limitada com swipe próprio, confirmar e tocar o alvo`,
  );

  return {
    duration: Number(match.groups.duration),
    endX: Number(match.groups.endX),
    endY: Number(match.groups.endY),
    startX: Number(match.groups.startX),
    startY: Number(match.groups.startY),
    times: Number(match.groups.times),
  };
}

test('nova avaliação não usa scrollUntilVisible central após altura e revela observações', async () => {
  const content = await assessmentFlow();

  assert.doesNotMatch(
    content,
    /scrollUntilVisible:\s+element: Adicione observações sobre a avaliação/,
    'scrollUntilVisible inicia o swipe no centro da tela, sobre Altura, e reabre o teclado',
  );
  criticalScroll(content, 'Adicione observações sobre a avaliação');
});

test('nova avaliação não usa scrollUntilVisible central após observações e revela salvar', async () => {
  const content = await assessmentFlow();

  assert.doesNotMatch(
    content,
    /scrollUntilVisible:\s+element: Salvar avaliação/,
    'scrollUntilVisible inicia o swipe no centro da tela e pode reabrir o teclado dos campos',
  );
  criticalScroll(content, 'Salvar avaliação');
});

test('rolagens críticas partem do gutter do ScrollView, acima dos TextInputs e do teclado', async () => {
  const content = await assessmentFlow();

  for (const target of ['Adicione observações sobre a avaliação', 'Salvar avaliação']) {
    const scroll = criticalScroll(content, target);
    const label = `rolagem até "${target}"`;

    // ScrollView começa em 42/1080 (3,9% da largura) e os EditText em 86/1080 (8,0%).
    assert.ok(
      scroll.startX >= 4 && scroll.startX <= 8,
      `${label}: início deve ficar no gutter do ScrollView, fora dos TextInputs`,
    );
    assert.equal(scroll.endX, scroll.startX, `${label}: swipe deve ser vertical`);
    assert.ok(
      scroll.startY >= 25 && scroll.startY <= 50,
      `${label}: início deve ficar acima do teclado`,
    );
    assert.ok(
      scroll.endY >= 15 && scroll.endY < scroll.startY,
      `${label}: fim deve subir dentro do ScrollView`,
    );
    assert.ok(scroll.times >= 1 && scroll.times <= 12, `${label}: repetição deve ser limitada`);
    assert.ok(
      scroll.duration >= 200 && scroll.duration <= 2000,
      `${label}: duração do swipe deve ser responsiva`,
    );
  }
});

test('nenhum repeat do fluxo de avaliações fica sem limite de iterações', async () => {
  const content = await assessmentFlow();
  const blocks = content.split(/- repeat:/).slice(1);

  assert.ok(blocks.length >= 2, 'o fluxo deve repetir a rolagem até os alvos móveis');
  for (const block of blocks) {
    const header = block.split(/- assertVisible:/)[0];
    assert.match(header, /^\s+times: [1-9]\d*$/m, 'todo repeat deve declarar times finito');
    assert.doesNotMatch(
      header,
      /while:\s+true:/,
      'repeat não pode depender de condição sempre verdadeira',
    );
  }
});

test('avaliação salva segue direto para o logout sem reabrir o Development Client', async () => {
  const content = await assessmentFlow();

  assert.doesNotMatch(
    content,
    /- (openLink|launchApp|stopApp):/,
    'o fluxo não pode relançar o Development Client: openLink após salvar derruba o app no launcher Android',
  );

  const saved = content.indexOf('- tapOn: Salvar avaliação');
  assert.ok(saved >= 0, 'o cenário deve salvar a avaliação');

  const verification =
    /- extendedWaitUntil:\s+visible: Abrir avaliação de \.\*\s+timeout: \d+/.exec(
      content.slice(saved),
    );
  assert.ok(verification, 'após salvar, o cenário deve aguardar a avaliação aparecer na lista');

  const afterVerification = content.slice(saved + verification.index + verification[0].length);
  const logout = /- runFlow: logout\.yaml/.exec(afterVerification);
  assert.ok(logout, 'após a avaliação salva, o cenário deve encerrar a sessão do professor');

  assert.equal(
    afterVerification.slice(0, logout.index).trim(),
    '',
    'entre a avaliação na lista e o logout não pode haver openLink, espera de Início ou relaunch',
  );
});

test('login dispensa o teclado antes de verificar e tocar em Entrar sem rolagem', async () => {
  const content = await readFile(join('.maestro', 'mobile', 'login.yaml'), 'utf8');

  assert.match(
    content,
    /- inputText: \$\{E2E_PASSWORD\}\s+- pressKey: Back\s+- assertVisible:\s+text: Entrar\s+below: Senha\s+- tapOn:\s+text: Entrar\s+below: Senha/,
    'após preencher a senha, deve dispensar o teclado antes de verificar e submeter o login',
  );
  assert.doesNotMatch(content, /- scrollUntilVisible:/, 'login não deve depender de rolagem');
});

test('expande all nos três cenários suportados', async () => {
  const { parseArgs } = await runnerModule();
  const options = parseArgs(['--scenario', 'all', '--mode', 'api-only']);

  assert.deepEqual(options.scenarios, ['aluno', 'professor', 'isolamento', 'avaliacoes-empatadas']);
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

test('agrupa artefatos sem alterar execução ou permitir traversal', async () => {
  const { artifactDirectory, parseArgs } = await runnerModule();
  const group = '790a8167-9e0e-42fe-a2e9-2711d1df5a43';
  const base = ['--scenario', 'aluno', '--mode', 'api-only'];
  const defaults = parseArgs(base);

  assert.equal(defaults.artifactGroup, undefined);
  assert.deepEqual(defaults.scenarios, ['aluno']);

  const grouped = parseArgs([...base, '--artifact-group', group]);
  assert.equal(grouped.artifactGroup, group);
  assert.deepEqual(grouped.scenarios, ['aluno']);
  assert.equal(grouped.artifactScope, defaults.artifactScope);

  for (const invalid of ['../x', 'grupo/outro', 'C:\\absoluto', '']) {
    assert.throws(
      () => parseArgs([...base, '--artifact-group', invalid]),
      /artifact-group/,
      `--artifact-group deve rejeitar "${invalid}"`,
    );
  }

  assert.equal(
    artifactDirectory(defaults, 'a1b2c3d4e5f6'),
    resolve('artifacts', 'mobile-e2e', 'a1b2c3d4e5f6'),
  );
  assert.equal(
    artifactDirectory(grouped, 'a1b2c3d4e5f6'),
    resolve('artifacts', 'mobile-e2e', group, 'a1b2c3d4e5f6'),
  );
});

test('professor rola o formulário pelo gutter do ScrollView antes de tocar Carga', async () => {
  const content = await professorFlow();

  assert.doesNotMatch(
    content,
    /scrollUntilVisible:\s+element:\s+Carga/,
    'scrollUntilVisible inicia o swipe no centro do formulário, sobre o campo Nome do treino',
  );

  const pattern = new RegExp(
    [
      '- repeat:',
      'times: (?<times>\\d+)',
      'while:',
      'notVisible: Carga',
      'commands:',
      '- swipe:',
      'start: (?<startX>\\d+)%, (?<startY>\\d+)%',
      'end: (?<endX>\\d+)%, (?<endY>\\d+)%',
      'duration: (?<duration>\\d+)',
    ].join('\\s+'),
  );
  const match = pattern.exec(content);
  assert.ok(
    match,
    'professor deve rolar até Carga com swipe próprio e confirmar o alvo fora do repeat',
  );
  assert.match(
    content.slice(match.index + match[0].length),
    /^\r?\n- assertVisible: Carga/,
    'a confirmação de Carga deve vir depois do repeat limitado',
  );

  const scroll = {
    duration: Number(match.groups.duration),
    endX: Number(match.groups.endX),
    endY: Number(match.groups.endY),
    startX: Number(match.groups.startX),
    startY: Number(match.groups.startY),
    times: Number(match.groups.times),
  };
  assert.ok(scroll.startX >= 4 && scroll.startX <= 8, 'swipe deve partir do gutter do ScrollView');
  assert.equal(scroll.endX, scroll.startX, 'swipe deve ser vertical');
  assert.ok(scroll.startY >= 25 && scroll.startY <= 50, 'swipe deve começar acima do teclado');
  assert.ok(
    scroll.endY >= 15 && scroll.endY < scroll.startY,
    'swipe deve subir dentro do ScrollView',
  );
  assert.ok(scroll.times >= 1 && scroll.times <= 12, 'repetição deve ser limitada');
  assert.ok(scroll.duration >= 200 && scroll.duration <= 2000, 'swipe deve ser responsivo');

  for (const kept of [
    'eraseText',
    "inputText: '24'",
    'Carga: 24 kg',
    '2 séries · 10 reps',
    'Avaliacao E2E',
    '78,5 kg',
    '170 cm',
  ]) {
    assert.ok(content.includes(kept), `professor deve preservar a asserção ${kept}`);
  }
  assert.match(
    content,
    /- runFlow: logout\.yaml/,
    'professor deve preservar o logout compartilhado da MUV-58',
  );
});

test('confirmação dispensa o teclado antes de tocar a senha do cadastro', async () => {
  const content = await readFile(join('.maestro', 'mobile', 'confirmacao-email.yaml'), 'utf8');

  assert.match(
    content,
    /- inputText: \$\{MAESTRO_E2E_VERIFICATION_EMAIL\}\s+- hideKeyboard\s+- tapOn:\s+id: signup-password/,
    'o teclado aberto após o email cobre o campo de senha; a senha deve ser tocada após dispensá-lo',
  );
  assert.match(
    content,
    /- inputText: \$\{MAESTRO_E2E_VERIFICATION_PASSWORD\}\s+- hideKeyboard\s+- tapOn:\s+id: signup-submit/,
    'o cadastro deve continuar enviando com o teclado dispensado',
  );

  for (const kept of [
    'Confirme seu email',
    'Enviar link',
    'Aguarde.*s',
    'INVALID_TOKEN',
    'Este link é inválido ou expirou. Solicite outro link.',
    'id: signup-submit',
  ]) {
    assert.ok(content.includes(kept), `confirmação deve preservar a asserção ${kept}`);
  }
});

test('aceita avaliações empatadas e inclui em all com Android', async () => {
  const { parseArgs } = await runnerModule();
  const args = ['--mode', 'android', '--device', 'emulator-5590', '--avd-name', 'exclusive'];
  assert.deepEqual(parseArgs(['--scenario', 'avaliacoes-empatadas', ...args]).scenarios, [
    'avaliacoes-empatadas',
  ]);
  assert.ok(parseArgs(['--scenario', 'all', ...args]).scenarios.includes('avaliacoes-empatadas'));
});
