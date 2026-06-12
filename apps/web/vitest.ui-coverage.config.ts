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
          'src/components/student-form.tsx',
          'src/components/onboarding-wizard.tsx',
          'src/components/stat-card.tsx',
          'src/components/sidebar.tsx',
          'src/components/top-bar.tsx',
          'src/app/**/students/_search.tsx',
          'src/app/**/students/**/assessments/_form.tsx',
          'src/app/**/students/**/assessments/_chart.tsx',
          'src/app/**/workouts/new/_editor.tsx',
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
