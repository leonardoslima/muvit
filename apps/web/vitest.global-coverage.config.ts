import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/lib/api/**',
          'src/components/ui/**',
          'src/app/page.tsx',
          'src/app/layout.tsx',
          'src/app/global-error.tsx',
          'src/app/providers.tsx',
          'src/instrumentation*.ts',
          'src/sentry.*.config.ts',
          'test/**',
        ],
      },
    },
  }),
);
