import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react-native';
import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { colors } from '../../../lib/design-system/tokens';
import { Button } from './button';
import type { Action } from './control';
import { Text, TextClassContext } from './text';

const variants = {
  success: {
    background: 'bg-v2-successBg',
    text: 'text-v2-success',
    color: colors.success,
    Icon: CircleCheck,
  },
  warning: {
    background: 'bg-v2-warningBg',
    text: 'text-v2-warning',
    color: colors.warning,
    Icon: TriangleAlert,
  },
  error: {
    background: 'bg-v2-errorBg',
    text: 'text-v2-error',
    color: colors.error,
    Icon: CircleX,
  },
  info: { background: 'bg-v2-infoBg', text: 'text-v2-info', color: colors.info, Icon: Info },
};
export type MessageProps = ViewProps & {
  title?: string;
  description?: string;
  variant?: keyof typeof variants;
  action?: Action;
  className?: string;
};
export const Message = forwardRef<View, MessageProps>(function Message(
  { title, description, variant = 'info', action, className, ...props },
  ref,
) {
  const { background, text, color, Icon } = variants[variant];
  const hasTitle = title !== undefined;
  return (
    <TextClassContext.Provider value={text}>
      <View
        {...props}
        ref={ref}
        accessibilityLiveRegion={props.accessibilityLiveRegion ?? 'polite'}
        className={cn('flex-row items-start gap-3 rounded-v2-card p-5', background, className)}
      >
        <Icon size={24} color={color} accessible={false} />
        <View className="min-w-0 flex-1 gap-2">
          {hasTitle && (
            <Text
              variant="label"
              accessibilityRole={variant === 'error' ? 'alert' : undefined}
              className="text-[16px] leading-[22.4px]"
            >
              {title}
            </Text>
          )}
          {description && (
            <Text accessibilityRole={variant === 'error' && !hasTitle ? 'alert' : undefined}>
              {description}
            </Text>
          )}
          {action && <Button {...action} variant="text" compact />}
        </View>
      </View>
    </TextClassContext.Provider>
  );
});
