import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'test/**',
          'src/lib/styles.ts',
          'src/lib/query-client.ts',
          'app/_layout.tsx',
          'app/(tabs)/_layout.tsx',
        ],
      },
    },
  }),
);
