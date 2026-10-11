// Adaptado de React Native Reusables; proveniência e licença em README.md e LICENSE.
import { Check, Clock3, Minus, TriangleAlert } from 'lucide-react-native';
import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { v2Colors } from '../../../lib/design-system/tokens';
import { Text, TextClassContext } from './text';

const variants = {
  active: {
    background: 'bg-v2-successBg',
    text: 'text-v2-success',
    color: v2Colors.success,
    Icon: Check,
  },
  inactive: {
    background: 'bg-v2-subtle',
    text: 'text-v2-secondary',
    color: v2Colors.secondary,
    Icon: Minus,
  },
  pending: {
    background: 'bg-v2-warningBg',
    text: 'text-v2-warning',
    color: v2Colors.warning,
    Icon: Clock3,
  },
  error: {
    background: 'bg-v2-errorBg',
    text: 'text-v2-error',
    color: v2Colors.error,
    Icon: TriangleAlert,
  },
};
export type BadgeProps = ViewProps & {
  label: string;
  variant?: keyof typeof variants;
  className?: string;
};
export const Badge = forwardRef<View, BadgeProps>(function Badge(
  { label, variant = 'active', className, ...props },
  ref,
) {
  const { background, text, color, Icon } = variants[variant];
  return (
    <TextClassContext.Provider value={text}>
      <View
        {...props}
        ref={ref}
        accessible
        accessibilityLabel={props.accessibilityLabel ?? label}
        className={cn(
          'min-h-[32px] flex-row items-center self-start gap-[6px] rounded-full px-3 py-2',
          background,
          className,
        )}
      >
        <Icon size={14} color={color} accessible={false} />
        <Text variant="support" className="shrink font-v2-bold">
          {label}
        </Text>
      </View>
    </TextClassContext.Provider>
  );
});
