// Adaptado de React Native Reusables; proveniência e licença em README.md e LICENSE.
import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { v2Colors } from '../../../lib/design-system/tokens';
import {
  type ControlVariant,
  controlClasses,
  controlTextClasses,
  pressedClasses,
  useControlState,
} from './control';
import { Text, TextClassContext } from './text';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ControlVariant;
  loading?: boolean;
  compact?: boolean;
  className?: string;
};

export const Button = forwardRef<View, ButtonProps>(function Button(
  { label, variant = 'primary', loading = false, compact = false, className, ...props },
  ref,
) {
  const control = useControlState(props, loading);
  const textClass = control.disabled ? 'text-v2-secondary' : controlTextClasses[variant];
  const spinnerColor = control.disabled
    ? v2Colors.secondary
    : variant === 'destructive'
      ? v2Colors.surface
      : variant === 'immersive'
        ? v2Colors.sessionText
        : variant === 'primary'
          ? v2Colors.text
          : v2Colors.brand;
  return (
    <TextClassContext.Provider value={textClass}>
      <Pressable
        {...props}
        ref={ref}
        {...control.handlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={props.accessibilityLabel ?? label}
        disabled={control.blocked}
        aria-disabled={control.blocked}
        aria-busy={loading}
        accessibilityState={{
          ...props.accessibilityState,
          disabled: control.blocked,
          busy: loading,
        }}
        className={cn(
          'flex-row items-center justify-center gap-2 rounded-v2-button border px-5 py-3',
          compact ? 'min-h-[52px]' : 'min-h-[58px]',
          controlClasses[variant],
          control.pressed && pressedClasses[variant],
          control.focused && 'border-2 border-v2-brand',
          control.disabled && 'bg-v2-disabled border-v2-disabled',
          className,
        )}
      >
        <View className="w-[20px] shrink-0 items-center">
          {loading && (
            <ActivityIndicator
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Carregando"
              color={spinnerColor}
              size="small"
            />
          )}
        </View>
        <Text variant="button" className="shrink text-center">
          {label}
        </Text>
        <View className="w-[20px] shrink-0" />
      </Pressable>
    </TextClassContext.Provider>
  );
});
