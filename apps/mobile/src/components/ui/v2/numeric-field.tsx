import { Minus, Plus } from 'lucide-react-native';
import { forwardRef } from 'react';
import type { TextInput } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { v2Colors, v2ControlSizes } from '../../../lib/design-system/tokens';
import { Field, type FieldProps } from './field';
import { IconButton } from './icon-button';

export type NumericFieldProps = Omit<FieldProps, 'kind' | 'leading' | 'trailing'> & {
  onIncrement: () => void;
  onDecrement: () => void;
  incrementLabel?: string;
  decrementLabel?: string;
};
export const NumericField = forwardRef<TextInput, NumericFieldProps>(function NumericField(
  {
    onIncrement,
    onDecrement,
    incrementLabel,
    decrementLabel,
    inputClassName,
    controlClassName,
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
  const variant = props.variant === 'immersive' ? 'immersive' : 'secondary';
  const color = props.variant === 'immersive' ? v2Colors.primary : v2Colors.brand;
  return (
    <Field
      {...props}
      ref={ref}
      kind="numeric"
      controlClassName={cn('gap-0 px-2', controlClassName)}
      inputClassName={cn(
        'min-w-[40px] text-center',
        props.variant === 'immersive' && 'font-v2-bold text-[25px] leading-[30px]',
        inputClassName,
      )}
      leading={
        <IconButton
          accessibilityLabel={decrementLabel ?? `Diminuir ${props.label}`}
          icon={<Minus size={v2ControlSizes.icon} color={color} />}
          onPress={onDecrement}
          disabled={disabled}
          variant={variant}
        />
      }
      trailing={
        <IconButton
          accessibilityLabel={incrementLabel ?? `Aumentar ${props.label}`}
          icon={<Plus size={v2ControlSizes.icon} color={color} />}
          onPress={onIncrement}
          disabled={disabled}
          variant={variant}
        />
      }
    />
  );
});
