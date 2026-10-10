import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'react-native': fileURLToPath(new URL('./test/react-native.mock.ts', import.meta.url).href),
      'react-native-svg': fileURLToPath(
        new URL('./test/react-native-svg.mock.ts', import.meta.url).href,
      ),
    },
  },
  test: {
    server: { deps: { inline: ['lucide-react-native'] } },
    environment: 'node',
    globals: true,
    include: ['app/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
