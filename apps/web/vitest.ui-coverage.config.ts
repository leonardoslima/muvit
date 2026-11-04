import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: [
          'src/components/confirmation-dialog.tsx',
          'src/components/student-form.tsx',
          'src/components/onboarding-wizard.tsx',
          'src/components/stat-card.tsx',
          'src/components/sidebar.tsx',
          'src/components/top-bar.tsx',
          'src/app/**/students/_search.tsx',
          'src/app/**/students/new/_student-wizard.tsx',
          'src/app/**/students/**/assessments/_form.tsx',
          'src/app/**/students/**/assessments/_chart.tsx',
          'src/app/**/students/**/assessments/page.tsx',
          'src/app/**/workouts/_exercise-drawer.tsx',
          'src/app/**/workouts/_workout-builder.tsx',
          'src/app/**/workouts/_workout-day-tabs.tsx',
          'src/app/**/workouts/_workout-details-panel.tsx',
          'src/app/**/workouts/_workout-empty-state.tsx',
          'src/app/**/workouts/_workout-exercise-table.tsx',
          'src/app/**/workouts/loading.tsx',
          'src/app/**/reports/_before-after.tsx',
          'src/app/**/reports/_physical-evolution.tsx',
          'src/app/**/reports/_report-dashboard.tsx',
          'src/app/**/reports/_report-filters.tsx',
          'src/app/**/reports/_report-summary.tsx',
          'src/app/**/reports/_workout-performance.tsx',
          'src/app/**/reports/page.tsx',
          'src/app/**/reports/loading.tsx',
          'src/app/**/reports/print/print-button.tsx',
          'src/app/**/reports/print/loading.tsx',
          'src/app/**/reports/print/page.tsx',
          'src/app/(print)/layout.tsx',
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
