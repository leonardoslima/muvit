import type { ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { radii } from '../../lib/styles';
import { Card } from './card';

export type PressableCardProps = Omit<
  PressableProps,
  'accessibilityRole' | 'accessibilityState' | 'accessible' | 'children' | 'disabled' | 'style'
> & {
  accessibilityState?: PressableProps['accessibilityState'];
  children: NonNullable<ReactNode>;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PressableCard({
  accessibilityState,
  children,
  disabled = false,
  style,
  ...props
}: PressableCardProps) {
  return (
    <Pressable
      {...props}
      accessible
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pressable,
        style,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Card>{children}</Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  pressable: {
    borderRadius: radii.lg,
  },
});
