import { type ReactNode, forwardRef } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, type View } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { v2Colors } from '../../../lib/design-system/tokens';
import { type ControlVariant, controlClasses, pressedClasses, useControlState } from './control';

export type IconButtonProps = Omit<PressableProps, 'children' | 'accessibilityLabel'> & {
  accessibilityLabel: string;
  icon: ReactNode;
  variant?: ControlVariant;
  loading?: boolean;
  className?: string;
};

export const IconButton = forwardRef<View, IconButtonProps>(function IconButton(
  { icon, variant = 'secondary', loading = false, className, ...props },
  ref,
) {
  const control = useControlState(props, loading);
  return (
    <Pressable
      {...props}
      ref={ref}
      {...control.handlers}
      accessible
      accessibilityRole="button"
      disabled={control.blocked}
      aria-disabled={control.blocked}
      aria-busy={loading}
      accessibilityState={{ ...props.accessibilityState, disabled: control.blocked, busy: loading }}
      className={cn(
        'min-h-[48px] min-w-[48px] items-center justify-center rounded-full border p-3',
        controlClasses[variant],
        variant === 'secondary' && 'bg-v2-subtle border-v2-subtle',
        control.pressed && pressedClasses[variant],
        variant === 'secondary' && control.pressed && 'bg-v2-disabled',
        control.focused && 'border-2 border-v2-brand',
        control.disabled && 'opacity-50',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Carregando"
          color={
            variant === 'destructive'
              ? v2Colors.surface
              : variant === 'immersive'
                ? v2Colors.sessionText
                : variant === 'primary'
                  ? v2Colors.text
                  : v2Colors.brand
          }
          size="small"
        />
      ) : (
        icon
      )}
    </Pressable>
  );
});
