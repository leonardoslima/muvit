// Adaptado de React Native Reusables; proveniência e licença em README.md e LICENSE.
import { type ReactNode, forwardRef } from 'react';
import { Pressable, type PressableProps, View, type ViewProps } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { type Action, useControlState } from './control';
import { TextClassContext } from './text';

export type CardProps = Omit<PressableProps, 'children' | 'onPress' | 'style'> & {
  children: ReactNode;
  action?: Action;
  variant?: 'default' | 'immersive' | 'highlight';
  className?: string;
  style?: ViewProps['style'];
};
export const Card = forwardRef<View, CardProps>(function Card(
  { children, action, variant = 'default', className, ...props },
  ref,
) {
  const control = useControlState(
    { ...props, onPress: action?.onPress, disabled: props.disabled || action?.disabled },
    action?.loading,
  );
  const classes = cn(
    'gap-2 border p-4',
    variant === 'immersive'
      ? 'rounded-v2-session bg-v2-sessionSurface border-v2-sessionBorder'
      : 'rounded-v2-card bg-v2-surface border-v2-border',
    variant === 'highlight' && 'rounded-v2-highlight bg-v2-brand',
    action &&
      control.pressed &&
      (variant === 'immersive'
        ? 'bg-v2-sessionRaised'
        : variant === 'highlight'
          ? 'opacity-80'
          : 'bg-v2-subtle'),
    action && control.focused && 'border-2 border-v2-brand',
    action && control.blocked && 'opacity-50',
    className,
  );
  return (
    <TextClassContext.Provider
      value={variant === 'default' ? 'text-v2-text' : 'text-v2-sessionText'}
    >
      {action ? (
        <Pressable
          {...props}
          ref={ref}
          {...control.handlers}
          accessible
          disabled={control.blocked}
          aria-disabled={control.blocked}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{
            ...props.accessibilityState,
            disabled: control.blocked,
            busy: Boolean(action.loading),
          }}
          aria-busy={Boolean(action.loading)}
          className={classes}
        >
          {children}
        </Pressable>
      ) : (
        <View {...props} ref={ref} className={classes}>
          {children}
        </View>
      )}
    </TextClassContext.Provider>
  );
});
