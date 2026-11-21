import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const appRoot = join(root, 'apps', 'mobile');
const expoCli = join(appRoot, 'node_modules', 'expo', 'bin', 'cli');
// Node 24 pode resolver localhost para ::1 enquanto o adb reverse usa IPv4.
const nodeOptions = process.env.NODE_OPTIONS ?? '';
const hasDnsOrder = /(?:^|\s)--dns-result-order(?:=|\s)/.test(nodeOptions);

const args = [
  ...(hasDnsOrder ? [] : ['--dns-result-order=ipv4first']),
  expoCli,
  'start',
  '--android',
  '--dev-client',
  '--localhost',
  ...process.argv.slice(2),
];

const child = spawn(process.execPath, args, {
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
