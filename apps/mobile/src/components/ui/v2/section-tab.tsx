import { forwardRef } from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { useControlState } from './control';
import { Text } from './text';

export type SectionTabProps = Omit<PressableProps, 'children'> & {
  label: string;
  selected?: boolean;
  className?: string;
};
export const SectionTab = forwardRef<View, SectionTabProps>(function SectionTab(
  { label, selected = false, className, ...props },
  ref,
) {
  const control = useControlState(props);
  return (
    <Pressable
      {...props}
      ref={ref}
      {...control.handlers}
      accessible
      accessibilityRole="tab"
      accessibilityLabel={props.accessibilityLabel ?? label}
      disabled={control.blocked}
      aria-disabled={control.blocked}
      aria-selected={selected}
      accessibilityState={{ ...props.accessibilityState, selected, disabled: control.blocked }}
      className={cn(
        'min-h-[52px] items-center justify-center rounded-v2-field border border-v2-border px-4 py-3',
        selected || control.pressed ? 'bg-v2-subtle' : 'bg-v2-surface',
        control.focused && 'border-2 border-v2-brand',
        control.blocked && 'opacity-50',
        className,
      )}
    >
      <Text variant="label" className="text-v2-brand text-center">
        {label}
      </Text>
    </Pressable>
  );
});
