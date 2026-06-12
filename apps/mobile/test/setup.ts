import Module from 'node:module';
import { afterEach, vi } from 'vitest';
import * as ReactNativeMock from './react-native.mock';

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
  return originalLoad.call(this, request, parent, isMain);
};

afterEach(async () => {
  const { cleanup } = await import('@testing-library/react-native/pure');
  cleanup();
  vi.clearAllMocks();
});
