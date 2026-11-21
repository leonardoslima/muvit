import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { buildInvocation, hasExplicitDnsResultOrder } from './mobile-android.mjs';

const explicitDnsOrders = [
  '--dns-result-order=ipv6first',
  '--dns_result_order=ipv6first',
  '--dns-result-order="ipv6first"',
  '--dns_result_order="ipv6first"',
  '"--dns-result-order=ipv6first"',
  '"--dns_result_order=ipv6first"',
  '"--dns-result-order=ipv6first" --no-warnings',
  '--no-warnings "--dns-result-order=ipv6first"',
  '--dns-result-order ipv6first',
  '--dns_result_order ipv6first',
];

const defaultDnsOrders = ['', '--no-warnings', '--trace-warnings', '--max-old-space-size=2048'];

function effectiveDnsOrder(nodeOptions) {
  const result = spawnSync(
    process.execPath,
    ['-e', 'process.stdout.write(require("node:dns").getDefaultResultOrder())'],
    { env: { ...process.env, NODE_OPTIONS: nodeOptions }, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test('Node 24 aplica as sintaxes explícitas e o wrapper não injeta ipv4first', () => {
  for (const nodeOptions of explicitDnsOrders) {
    assert.equal(effectiveDnsOrder(nodeOptions), 'ipv6first', nodeOptions);
    assert.equal(hasExplicitDnsResultOrder(nodeOptions), true, nodeOptions);
    assert.deepEqual(buildInvocation({ nodeOptions }).nodeFlags, [], nodeOptions);
  }
});

test('sem override explícito o wrapper injeta ipv4first', () => {
  for (const nodeOptions of defaultDnsOrders) {
    assert.equal(effectiveDnsOrder(nodeOptions), 'verbatim', nodeOptions);
    assert.equal(hasExplicitDnsResultOrder(nodeOptions), false, nodeOptions);
    assert.deepEqual(
      buildInvocation({ nodeOptions }).nodeFlags,
      ['--dns-result-order=ipv4first'],
      nodeOptions,
    );
  }
});

test('configuração de Node não relacionada e argumentos extras são preservados', () => {
  const nodeOptions = '--no-warnings';
  const extraArgs = ['--port', '8099'];
  const invocation = buildInvocation({ nodeOptions, extraArgs });
  assert.deepEqual(invocation.nodeFlags, ['--dns-result-order=ipv4first']);
  assert.deepEqual(invocation.args.slice(-4), ['--dev-client', '--localhost', '--port', '8099']);
  assert.match(invocation.args[0], /expo[\\/]bin[\\/]cli$/);

  const result = spawnSync(
    process.execPath,
    [
      ...invocation.nodeFlags,
      '-e',
      'process.stdout.write(JSON.stringify({ order: require("node:dns").getDefaultResultOrder(), nodeOptions: process.env.NODE_OPTIONS }))',
    ],
    { env: { ...process.env, NODE_OPTIONS: nodeOptions }, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { order: 'ipv4first', nodeOptions });
});
