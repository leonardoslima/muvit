import { Minus, Plus } from 'lucide-react-native';
import { forwardRef } from 'react';
import type { TextInput } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { colors, controlSizes } from '../../../lib/design-system/tokens';
import { Field, type FieldProps } from './field';
import { IconButton } from './icon-button';

export type NumericFieldProps = Omit<FieldProps, 'kind' | 'leading' | 'trailing'> & {
  onIncrement: () => void;
  onDecrement: () => void;
  incrementLabel?: string;
  decrementLabel?: string;
  stepperClassName?: string;
};
export const NumericField = forwardRef<TextInput, NumericFieldProps>(function NumericField(
  {
    onIncrement,
    onDecrement,
    incrementLabel,
    decrementLabel,
    inputClassName,
    controlClassName,
    stepperClassName,
    labelClassName,
    ...props
  },
  ref,
) {
  const disabled =
    props.disabled ||
    props.loading ||
    props.readOnly ||
    props.editable === false ||
    Boolean(props.accessibilityState?.disabled || props['aria-disabled'] || props['aria-busy']);
  const immersive = props.variant === 'immersive';
  const variant = immersive ? 'immersive' : 'secondary';
  const color = immersive ? (disabled ? colors.sessionSecondary : colors.primary) : colors.brand;
  const stepperClasses = cn(
    immersive && 'border-0 bg-v2-sessionRaised p-0',
    stepperClassName,
    immersive && disabled && 'bg-v2-sessionSurface opacity-100',
  );
  return (
    <Field
      {...props}
      ref={ref}
      disabled={disabled}
      kind="numeric"
      surfaceClassName={
        immersive
          ? 'gap-5 rounded-v2-field border border-v2-sessionBorder bg-v2-sessionSurface p-2 pt-4'
          : undefined
      }
      labelClassName={cn(immersive && 'ml-2 text-[10px] leading-[13.5px]', labelClassName)}
      controlClassName={cn(
        'gap-0 px-2',
        immersive && 'min-h-[48px] border-0 bg-transparent px-0',
        controlClassName,
      )}
      inputClassName={cn(
        'min-w-[40px] text-center',
        props.variant === 'immersive' && 'font-v2-bold text-[25px] leading-[30px]',
        inputClassName,
      )}
      leading={
        <IconButton
          accessibilityLabel={decrementLabel ?? `Diminuir ${props.label}`}
          icon={<Minus size={controlSizes.icon} color={color} />}
          onPress={onDecrement}
          disabled={disabled}
          variant={variant}
          className={stepperClasses}
        />
      }
      trailing={
        <IconButton
          accessibilityLabel={incrementLabel ?? `Aumentar ${props.label}`}
          icon={<Plus size={controlSizes.icon} color={color} />}
          onPress={onIncrement}
          disabled={disabled}
          variant={variant}
          className={stepperClasses}
        />
      }
    />
  );
});
