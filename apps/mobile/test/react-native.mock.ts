import React, { type ReactNode } from 'react';

type NativeProps = Record<string, unknown> & {
  children?: ReactNode;
  style?: unknown;
  visible?: boolean;
};

function flattenStyle(style: unknown): Record<string, unknown> | undefined {
  if (!style) return undefined;
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, item) => ({ ...acc, ...flattenStyle(item) }),
      {},
    );
  }
  if (typeof style === 'object') return style as Record<string, unknown>;
  return {};
}

function host(type: string) {
  return React.forwardRef<unknown, NativeProps>(({ children, ...props }, ref) =>
    React.createElement(type, { ...props, ref }, children),
  );
}

export const ActivityIndicator = host('View');
export const Image = host('Image');
export const Pressable = host('View');
export const ScrollView = host('RCTScrollView');
export const Text = host('Text');
export const TextInput = host('TextInput');
export const View = host('View');

export const Modal = React.forwardRef<unknown, NativeProps>(
  ({ children, visible, ...props }, ref) =>
    visible === false ? null : React.createElement('Modal', { ...props, ref }, children),
);

export const Platform = {
  OS: 'ios',
  select: (options: Record<string, unknown>) => options.ios ?? options.native ?? options.default,
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T) => styles,
  flatten: flattenStyle,
};
