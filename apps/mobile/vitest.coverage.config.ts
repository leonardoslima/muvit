import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: [
          'src/application/assessments/new-assessment.ts',
          'src/application/workouts/workout-log.ts',
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
