const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const workspace = path.resolve(__dirname, '..');
const android = path.join(workspace, 'apps', 'mobile', 'android');
const gradlew = path.join(android, 'gradlew.bat');

function gradle(env, initScript, projectDir = android, task = 'help') {
  const init = initScript ? ` -I "${initScript}"` : '';
  return spawnSync(
    'cmd.exe',
    ['/d', '/s', '/c', `""${gradlew}" -p "${projectDir}" ${task} -q${init}"`],
    {
      cwd: workspace,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      windowsVerbatimArguments: true,
      timeout: 120000,
    },
  );
}

test(
  'autolinking restaura caminhos físicos após remover o alias',
  { skip: process.platform !== 'win32' },
  () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'muvit-alias-switch-'));
    const alias = path.join(fixture, 'workspace');
    const generated = path.join(
      android,
      'app',
      'build',
      'generated',
      'autolinking',
      'src',
      'main',
      'jni',
      'Android-autolinking.cmake',
    );
    const task = ':app:generateAutolinkingNewArchitectureFiles';
    try {
      fs.symlinkSync(workspace, alias, 'junction');
      const withAlias = gradle(
        {
          MUVIT_WORKSPACE_ALIAS: alias,
          MUVIT_NATIVE_ROOT: path.join(alias, 'apps', 'mobile', 'android', '.cxx-muvit'),
        },
        undefined,
        android,
        task,
      );
      assert.equal(withAlias.error, undefined, withAlias.error?.message);
      assert.equal(withAlias.status, 0, withAlias.stdout + withAlias.stderr);
      assert.ok(
        fs.readFileSync(generated, 'utf8').includes(`${alias.replaceAll('\\', '/')}/node_modules/`),
      );

      const withoutAlias = gradle(
        { MUVIT_WORKSPACE_ALIAS: undefined, MUVIT_NATIVE_ROOT: undefined },
        undefined,
        android,
        task,
      );
      assert.equal(withoutAlias.error, undefined, withoutAlias.error?.message);
      assert.equal(withoutAlias.status, 0, withoutAlias.stdout + withoutAlias.stderr);
      const contents = fs.readFileSync(generated, 'utf8');
      assert.ok(contents.includes(`${workspace.replaceAll('\\', '/')}/node_modules/`));
      assert.ok(!contents.includes(`${alias.replaceAll('\\', '/')}/`));
    } finally {
      fs.rmSync(alias, { force: true });
      fs.rmdirSync(fixture);
    }
  },
);

test(
  'staging rejeita caminho externo, relativo e saída por junction',
  { skip: process.platform !== 'win32' },
  () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'muvit-staging-test-'));
    const inside = fs.mkdtempSync(path.join(android, '.muvit-staging-test-'));
    const junction = path.join(inside, 'junction');
    try {
      fs.symlinkSync(outside, junction, 'junction');
      for (const nativeRoot of [
        path.parse(workspace).root,
        path.join(outside, '.cxx-muvit'),
        '.cxx-muvit',
        path.join(junction, '.cxx-muvit'),
      ]) {
        const result = gradle({
          MUVIT_WORKSPACE_ALIAS: `${workspace}${path.sep}`,
          MUVIT_NATIVE_ROOT: nativeRoot,
        });
        assert.equal(result.error, undefined, result.error?.message);
        assert.notEqual(result.status, 0, `staging indevido aceito: ${nativeRoot}`);
        assert.match(result.stdout + result.stderr, /MUVIT_NATIVE_ROOT/);
      }
    } finally {
      fs.rmSync(junction);
      fs.rmdirSync(inside);
      fs.rmdirSync(outside);
    }
  },
);

test(
  'junction no próprio staging reservado não pode apontar para fora',
  { skip: process.platform !== 'win32' },
  () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'muvit-project-test-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'muvit-target-test-'));
    const project = path.join(fixture, 'apps', 'mobile', 'android');
    const junction = path.join(project, '.cxx-muvit');
    try {
      fs.mkdirSync(project, { recursive: true });
      const script = path
        .join(workspace, 'apps', 'mobile', 'plugins', 'windows-settings.gradle')
        .replaceAll('\\', '/');
      fs.writeFileSync(path.join(project, 'settings.gradle'), `apply from: '${script}'\n`);
      fs.symlinkSync(outside, junction, 'junction');
      const result = gradle(
        { MUVIT_WORKSPACE_ALIAS: fixture, MUVIT_NATIVE_ROOT: junction },
        undefined,
        project,
      );
      assert.equal(result.error, undefined, result.error?.message);
      assert.notEqual(result.status, 0);
      assert.match(result.stdout + result.stderr, /MUVIT_NATIVE_ROOT/);
    } finally {
      fs.rmSync(junction, { force: true });
      assert.equal(fs.realpathSync(path.dirname(fixture)), fs.realpathSync(os.tmpdir()));
      assert.ok(path.basename(fixture).startsWith('muvit-project-test-'));
      fs.rmSync(fixture, { recursive: true });
      fs.rmdirSync(outside);
    }
  },
);

test(
  'junction em destino de app ou biblioteca não pode desviar o staging',
  { skip: process.platform !== 'win32' },
  () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'muvit-project-test-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'muvit-target-test-'));
    const project = path.join(fixture, 'apps', 'mobile', 'android');
    const nativeRoot = path.join(project, '.cxx-muvit');
    const script = path
      .join(workspace, 'apps', 'mobile', 'plugins', 'windows-settings.gradle')
      .replaceAll('\\', '/');
    try {
      fs.mkdirSync(path.join(project, 'app'), { recursive: true });
      fs.mkdirSync(path.join(project, 'biblioteca'));
      fs.mkdirSync(nativeRoot);
      fs.writeFileSync(
        path.join(project, 'settings.gradle'),
        `include ':app', ':biblioteca'\napply from: '${script}'\n`,
      );
      for (const name of ['app', 'biblioteca']) {
        const junction = path.join(nativeRoot, name);
        try {
          fs.symlinkSync(outside, junction, 'junction');
          const result = gradle(
            { MUVIT_WORKSPACE_ALIAS: fixture, MUVIT_NATIVE_ROOT: nativeRoot },
            undefined,
            project,
          );
          assert.equal(result.error, undefined, result.error?.message);
          assert.notEqual(result.status, 0, `junction de ${name} foi aceita`);
          assert.match(result.stdout + result.stderr, /MUVIT_NATIVE_ROOT/);
          assert.deepEqual(fs.readdirSync(outside), []);
        } finally {
          fs.rmSync(junction, { force: true });
        }
      }
      fs.mkdirSync(path.join(nativeRoot, 'app'));
      const nested = path.join(nativeRoot, 'app', 'Debug');
      try {
        fs.symlinkSync(outside, nested, 'junction');
        const result = gradle(
          { MUVIT_WORKSPACE_ALIAS: fixture, MUVIT_NATIVE_ROOT: nativeRoot },
          undefined,
          project,
        );
        assert.equal(result.error, undefined, result.error?.message);
        assert.notEqual(result.status, 0, 'junction dentro do staging foi aceita');
        assert.match(result.stdout + result.stderr, /MUVIT_NATIVE_ROOT/);
        assert.deepEqual(fs.readdirSync(outside), []);
      } finally {
        fs.rmSync(nested, { force: true });
      }
    } finally {
      assert.equal(fs.realpathSync(path.dirname(fixture)), fs.realpathSync(os.tmpdir()));
      assert.ok(path.basename(fixture).startsWith('muvit-project-test-'));
      fs.rmSync(fixture, { recursive: true });
      fs.rmdirSync(outside);
    }
  },
);

test(
  'alias absoluto aceita barras Windows e normaliza o caminho usado no CMake',
  { skip: process.platform !== 'win32' },
  () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'muvit-alias-test-'));
    const initScript = path.join(fixture, 'check.gradle');
    try {
      fs.writeFileSync(
        initScript,
        "gradle.settingsEvaluated { if (gradle.ext.has('muvitWorkspaceAlias')) println('MUVIT_TEST_ALIAS=' + gradle.ext.muvitWorkspaceAlias) }\n",
      );
      for (const alias of [`${workspace}\\`, `${workspace.replaceAll('\\', '/')}/`]) {
        const result = gradle(
          { MUVIT_WORKSPACE_ALIAS: alias, MUVIT_NATIVE_ROOT: path.join(android, '.cxx-muvit') },
          initScript,
        );
        assert.equal(result.error, undefined, result.error?.message);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.ok(
          result.stdout.includes(`MUVIT_TEST_ALIAS=${workspace.replaceAll('\\', '/')}/`),
          result.stdout,
        );
      }
    } finally {
      fs.rmSync(initScript);
      fs.rmdirSync(fixture);
    }
  },
);

test('alias relativo à unidade é rejeitado', { skip: process.platform !== 'win32' }, () => {
  const result = gradle({
    MUVIT_WORKSPACE_ALIAS: 'R:',
    MUVIT_NATIVE_ROOT: path.join(android, '.cxx-muvit'),
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /MUVIT_WORKSPACE_ALIAS/);
});

test(
  'staging reservado dentro do Android gerado é aceito',
  { skip: process.platform !== 'win32' },
  () => {
    const result = gradle({
      MUVIT_WORKSPACE_ALIAS: `${workspace}${path.sep}`,
      MUVIT_NATIVE_ROOT: path.join(android, '.cxx-muvit'),
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  },
);

test(
  'configuração sem variáveis continua utilizável',
  { skip: process.platform !== 'win32' },
  () => {
    const result = gradle({ MUVIT_WORKSPACE_ALIAS: undefined, MUVIT_NATIVE_ROOT: undefined });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  },
);
