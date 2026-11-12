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
    // lucide-react-native deve ser externalizado: inlinar o barrel de ~1600 ícones custa ~8s
    // de transform e estoura o hookTimeout padrão dos beforeAll que importam telas.
    environment: 'node',
    globals: true,
    include: ['app/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
