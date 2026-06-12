import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        all: true,
        provider: 'v8',
        include: [
          'src/screens/today-workout.tsx',
          'src/screens/progress.tsx',
          'src/screens/profile.tsx',
          'src/screens/log-workout.tsx',
          'src/screens/new-assessment.tsx',
        ],
        exclude: ['src/**/*.test.{ts,tsx}', 'test/**'],
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
