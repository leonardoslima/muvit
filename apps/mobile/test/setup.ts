import Module from 'node:module';
import { afterEach, vi } from 'vitest';
import * as ReactNativeSvgMock from './react-native-svg.mock';
import * as ReactNativeMock from './react-native.mock';

process.env.RNTL_SKIP_AUTO_CLEANUP = 'true';

vi.mock('react-native-gesture-handler', () => import('./gesture-animation.mock'));
vi.mock('react-native-reanimated', () => import('./gesture-animation.mock'));

vi.mock('@react-navigation/bottom-tabs', async () => ({
  BottomTabBarHeightContext: (await import('react')).createContext<number | undefined>(undefined),
}));

type ModuleLoader = (this: unknown, request: string, parent: unknown, isMain: boolean) => unknown;

const moduleWithLoad = Module as typeof Module & { _load: ModuleLoader };
const originalLoad = moduleWithLoad._load;

moduleWithLoad._load = function loadWithReactNativeMock(
  this: unknown,
  request: string,
  parent: unknown,
  isMain: boolean,
) {
  if (request === 'react-native') return ReactNativeMock;
  const normalizedRequest = request.replaceAll('\\', '/');
  if (
    request === 'react-native-svg' ||
    /\/react-native-svg\/lib\/(commonjs|module)\/index\.js$/.test(normalizedRequest)
  ) {
    return ReactNativeSvgMock;
  }
  return originalLoad.call(this, request, parent, isMain);
};

afterEach(async () => {
  const { cleanup } = await import('@testing-library/react-native/pure');
  cleanup();
  vi.clearAllMocks();
});
