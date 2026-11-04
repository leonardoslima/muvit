import { useState } from 'react';
import type { PressableProps } from 'react-native';

export type Action = { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
export type ControlVariant = 'primary' | 'secondary' | 'destructive' | 'text' | 'immersive';

export const controlClasses: Record<ControlVariant, string> = {
  primary: 'bg-v2-primary border-v2-primary',
  secondary: 'bg-v2-surface border-v2-border',
  destructive: 'bg-v2-error border-v2-error',
  text: 'bg-transparent border-transparent',
  immersive: 'bg-v2-sessionSurface border-v2-sessionBorder',
};
export const pressedClasses: Record<ControlVariant, string> = {
  primary: 'bg-v2-primaryPressed border-v2-primaryPressed',
  secondary: 'bg-v2-subtle',
  destructive: 'opacity-80',
  text: 'bg-v2-subtle',
  immersive: 'opacity-80',
};
export const controlTextClasses: Record<ControlVariant, string> = {
  primary: 'text-v2-text',
  secondary: 'text-v2-brand',
  destructive: 'text-v2-surface',
  text: 'text-v2-brand',
  immersive: 'text-v2-sessionText',
};

export function useControlState(props: PressableProps, loading = false) {
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const disabled = Boolean(
    props.disabled || props.accessibilityState?.disabled || props['aria-disabled'],
  );
  const blocked = disabled || loading;
  const onFocus: NonNullable<PressableProps['onFocus']> = (event) => {
    setFocused(true);
    props.onFocus?.(event);
  };
  const onBlur: NonNullable<PressableProps['onBlur']> = (event) => {
    setFocused(false);
    props.onBlur?.(event);
  };
  const onPressIn: NonNullable<PressableProps['onPressIn']> = (event) => {
    setPressed(true);
    props.onPressIn?.(event);
  };
  const onPressOut: NonNullable<PressableProps['onPressOut']> = (event) => {
    setPressed(false);
    props.onPressOut?.(event);
  };
  const onPress: NonNullable<PressableProps['onPress']> = (event) => {
    if (!blocked) props.onPress?.(event);
  };
  return {
    focused: focused && !blocked,
    pressed: pressed && !blocked,
    blocked,
    disabled,
    handlers: { onFocus, onBlur, onPressIn, onPressOut, onPress },
  };
}
