import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const appRoot = join(root, 'apps', 'mobile');
const expoCli = join(appRoot, 'node_modules', 'expo', 'bin', 'cli');

function splitNodeOptions(value) {
  const tokens = [];
  let token = '';
  let quote = null;

  for (const character of value) {
    if (quote) {
      if (character === quote) quote = null;
      else token += character;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      if (token) {
        tokens.push(token);
        token = '';
      }
      continue;
    }
    token += character;
  }

  if (token) tokens.push(token);
  return tokens;
}

export function hasExplicitDnsResultOrder(nodeOptions = '') {
  return splitNodeOptions(nodeOptions).some((token) => {
    const normalized = token.replaceAll('_', '-');
    return /^--dns-result-order(?:=|$)/.test(normalized);
  });
}

export function buildInvocation({ nodeOptions = '', expoCli: cli = expoCli, extraArgs = [] } = {}) {
  return {
    nodeFlags: hasExplicitDnsResultOrder(nodeOptions) ? [] : ['--dns-result-order=ipv4first'],
    args: [cli, 'start', '--android', '--dev-client', '--localhost', ...extraArgs],
  };
}

function main() {
  const { nodeFlags, args } = buildInvocation({
    nodeOptions: process.env.NODE_OPTIONS ?? '',
    expoCli,
    extraArgs: process.argv.slice(2),
  });
  const child = spawn(process.execPath, [...nodeFlags, ...args], {
    cwd: appRoot,
    env: process.env,
    stdio: 'inherit',
  });

  child.once('error', (error) => {
    console.error(`Não foi possível iniciar o Expo: ${error.message}`);
    process.exit(1);
  });

  child.once('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
