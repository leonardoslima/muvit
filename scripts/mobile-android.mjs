import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const appRoot = join(root, 'apps', 'mobile');
const expoCli = join(appRoot, 'node_modules', 'expo', 'bin', 'cli');
const dnsOrderFlag = '--dns-result-order=ipv4first';

export function buildInvocation({
  nodeOptions = '',
  expoCli: cli = expoCli,
  extraArgs = [],
  env = process.env,
} = {}) {
  const childNodeOptions = nodeOptions ? `${dnsOrderFlag} ${nodeOptions}` : dnsOrderFlag;
  return {
    args: [cli, 'start', '--android', '--dev-client', '--localhost', ...extraArgs],
    env: { ...env, NODE_OPTIONS: childNodeOptions },
  };
}

function main() {
  const { args, env } = buildInvocation({
    nodeOptions: process.env.NODE_OPTIONS ?? '',
    expoCli,
    extraArgs: process.argv.slice(2),
    env: process.env,
  });
  const child = spawn(process.execPath, args, {
    cwd: appRoot,
    env,
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
