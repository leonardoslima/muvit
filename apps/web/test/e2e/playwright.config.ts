import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

const required = [
  'WEB_E2E_BASE_URL',
  'WEB_E2E_API_URL',
  'WEB_E2E_RUN_ID',
  'WEB_E2E_ARTIFACT_DIR',
  'WEB_E2E_SCENARIO',
  'WEB_E2E_MAILBOX_URL',
  'WEB_E2E_MAILBOX_SECRET',
] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} é obrigatório; execute pelo runner web:e2e`);
}
const scenario = process.env.WEB_E2E_SCENARIO;
if (!['all', 'jornada', 'isolamento', 'confirmacao-email'].includes(scenario ?? ''))
  throw new Error('WEB_E2E_SCENARIO inválido');

export default defineConfig({
  testDir: '.',
  testMatch:
    scenario === 'jornada'
      ? 'personal-journey.spec.ts'
      : scenario === 'isolamento'
        ? 'session-isolation.spec.ts'
        : scenario === 'confirmacao-email'
          ? 'email-verification.spec.ts'
          : '*.spec.ts',
  outputDir: join(process.env.WEB_E2E_ARTIFACT_DIR ?? '', 'playwright-output'),
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: process.argv.includes('--list') ? 'list' : [['./safe-reporter.ts']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.WEB_E2E_BASE_URL,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
});
