import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

export default class SafeReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult): void {
    process.stdout.write(`${result.status}: ${test.title}\n`);
    if (result.error) {
      const line = ((result.error.message ?? 'Falha').split('\n')[0] ?? 'Falha')
        .replace(/[A-Za-z0-9._%+-]+@example\.invalid/g, '[REDACTED]')
        .replace(/[A-Za-z0-9_-]{24,}/g, '[REDACTED]');
      const location =
        result.error.stack?.match(
          /(?:fixtures|personal-journey\.spec|session-isolation\.spec)\.ts:\d+:\d+/,
        )?.[0] ?? '';
      process.stdout.write(`${line} ${location}\n`);
    }
  }
  onEnd(result: FullResult): void {
    process.stdout.write(`Resultado: ${result.status}\n`);
  }
}
