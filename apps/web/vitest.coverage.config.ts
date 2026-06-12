import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: [
          'src/application/assessments/assessment-form-data.ts',
          'src/application/form-data.ts',
          'src/application/http/headers.ts',
          'src/application/students/student-form.ts',
          'src/lib/muscle-groups.ts',
          'src/lib/utils.ts',
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
