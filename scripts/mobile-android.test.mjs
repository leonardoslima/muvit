import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { buildInvocation } from './mobile-android.mjs';

const flag = '--dns-result-order=ipv4first';
const tempDir = mkdtempSync(join(tmpdir(), 'muvit-mobile-android-'));
const apostropheFile = join(tempDir, "it's-ok.cjs");
const escapeFile =
  process.platform === 'win32' ? join(tempDir, "it's-escape.cjs") : join(tempDir, 'it\\escape.cjs');
writeFileSync(apostropheFile, 'globalThis.__muvitProbe = true;\n');
writeFileSync(escapeFile, 'globalThis.__muvitProbe = true;\n');
after(() => rmSync(tempDir, { recursive: true, force: true }));

const apostrophePath = apostropheFile.replaceAll('\\', '/');
const escapedPath = escapeFile.replaceAll('\\', '\\\\');

const explicitDnsOrders = [
  '--dns-result-order=ipv6first',
  '--dns_result_order=ipv6first',
  '--dns-result-order="ipv6first"',
  '"--dns-result-order=ipv6first"',
  '--dns-result-order ipv6first',
  '--dns_result_order ipv6first',
  '--no-warnings --dns-result-order=ipv6first',
  '"--dns-result-order=ipv6first" --no-warnings',
  `--require=${apostrophePath} --dns-result-order=ipv6first`,
  `--require="${apostrophePath}" --dns-result-order=ipv6first`,
  `--require="${escapedPath}" --dns-result-order=ipv6first`,
];

const defaultDnsOrders = ['', '--no-warnings', '--trace-warnings', '--max-old-space-size=2048'];

function effectiveDnsOrder(nodeOptions) {
  const { env } = buildInvocation({ nodeOptions });
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      'process.stdout.write(JSON.stringify({ order: require("node:dns").getDefaultResultOrder(), nodeOptions: process.env.NODE_OPTIONS }))',
    ],
    { env, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('ordem explícita vence o prefixo do wrapper', () => {
  for (const nodeOptions of explicitDnsOrders) {
    const invocation = buildInvocation({ nodeOptions });
    assert.equal(invocation.env.NODE_OPTIONS, `${flag} ${nodeOptions}`, nodeOptions);
    assert.ok(!invocation.args.includes(flag), nodeOptions);
    const effective = effectiveDnsOrder(nodeOptions);
    assert.equal(effective.order, 'ipv6first', nodeOptions);
    assert.equal(effective.nodeOptions, `${flag} ${nodeOptions}`, nodeOptions);
  }
});

test('sem override explícito o filho aplica ipv4first', () => {
  for (const nodeOptions of defaultDnsOrders) {
    const invocation = buildInvocation({ nodeOptions });
    assert.equal(
      invocation.env.NODE_OPTIONS,
      nodeOptions ? `${flag} ${nodeOptions}` : flag,
      nodeOptions,
    );
    assert.ok(!invocation.args.includes(flag), nodeOptions);
    const effective = effectiveDnsOrder(nodeOptions);
    assert.equal(effective.order, 'ipv4first', nodeOptions);
  }
});

test('ambiente alheio e argumentos extras são preservados', () => {
  const externalEnv = {
    ...process.env,
    MUVIT_TEST_SENTINEL: 'preserved',
    NODE_OPTIONS: '--no-warnings',
  };
  const extraArgs = ['--port', '8099'];
  const invocation = buildInvocation({
    nodeOptions: externalEnv.NODE_OPTIONS,
    extraArgs,
    env: externalEnv,
  });

  assert.equal(invocation.env.MUVIT_TEST_SENTINEL, 'preserved');
  assert.equal(invocation.env.NODE_OPTIONS, `${flag} --no-warnings`);
  assert.equal(externalEnv.NODE_OPTIONS, '--no-warnings');
  assert.deepEqual(invocation.args.slice(-4), ['--dev-client', '--localhost', '--port', '8099']);
  assert.ok(!invocation.args.includes(flag));

  const result = spawnSync(
    process.execPath,
    [
      '-e',
      'process.stdout.write(JSON.stringify({ order: require("node:dns").getDefaultResultOrder(), nodeOptions: process.env.NODE_OPTIONS, sentinel: process.env.MUVIT_TEST_SENTINEL }))',
    ],
    { env: invocation.env, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    order: 'ipv4first',
    nodeOptions: `${flag} --no-warnings`,
    sentinel: 'preserved',
  });
});
