import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: [
          'src/application/**/*.ts',
          'src/lib/api.ts',
          'src/lib/config-url.ts',
          'src/lib/log-queue.ts',
          'src/lib/offline-cache.ts',
          'src/lib/push-token.ts',
          'src/lib/uploads.ts',
        ],
        exclude: ['src/**/*.test.ts', 'test/**'],
        thresholds: {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85,
        },
      },
    },
  }),
);
