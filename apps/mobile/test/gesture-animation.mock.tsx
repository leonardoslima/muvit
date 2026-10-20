import { type ReactNode, useRef } from 'react';
import { Image, View } from 'react-native';
import { vi } from 'vitest';

export class MockPinchGesture {
  handlers: {
    start?: () => void;
    update?: (event: { scale: number }) => void;
    finalize?: (success: boolean) => void;
  } = {};
  onStart(callback: () => void): this {
    this.handlers.start = callback;
    return this;
  }
  onUpdate(callback: (event: { scale: number }) => void): this {
    this.handlers.update = callback;
    return this;
  }
  onFinalize(callback: (event: unknown, success: boolean) => void): this {
    this.handlers.finalize = (success: boolean) => callback({}, success);
    return this;
  }
}

export const Gesture = { Pinch: () => new MockPinchGesture() };
export const GestureHandlerRootView = View;
export function GestureDetector({
  children,
}: { children: ReactNode; gesture: MockPinchGesture }): ReactNode {
  return children;
}
export function useSharedValue(initial: number): { value: number } {
  return useRef({ value: initial }).current;
}
export function useAnimatedStyle(updater: () => Record<string, unknown>): Record<string, unknown> {
  const style = {};
  for (const key of Object.keys(updater())) {
    Object.defineProperty(style, key, { enumerable: true, get: () => updater()[key] });
  }
  return style;
}
export const withTiming = vi.fn((value: number, _config?: { duration: number }): number => value);
export const cancelAnimation = vi.fn((_value: { value: number }): void => undefined);
export default { Image, View };
