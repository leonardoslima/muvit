import { CircleCheck, CircleX, Inbox } from 'lucide-react-native';
import { forwardRef } from 'react';
import { ActivityIndicator, View, type ViewProps } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { colors } from '../../../lib/design-system/tokens';
import { Button } from './button';
import type { Action } from './control';
import { Text } from './text';

export type StatePanelProps = ViewProps & {
  kind: 'loading' | 'empty' | 'error' | 'success';
  title: string;
  description?: string;
  action?: Action;
  variant?: 'default' | 'immersive';
  className?: string;
};
export const StatePanel = forwardRef<View, StatePanelProps>(function StatePanel(
  { kind, title, description, action, variant = 'default', className, ...props },
  ref,
) {
  const immersive = variant === 'immersive';
  const color = kind === 'error' ? colors.error : immersive ? colors.sessionText : colors.brand;
  const Icon = kind === 'error' ? CircleX : kind === 'success' ? CircleCheck : Inbox;
  return (
    <View
      {...props}
      ref={ref}
      accessibilityLiveRegion={props.accessibilityLiveRegion ?? 'polite'}
      className={cn('flex-grow items-center justify-center gap-4 px-4 py-8', className)}
    >
      {kind === 'loading' ? (
        <ActivityIndicator
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={title}
          color={color}
          size="large"
        />
      ) : (
        <Icon size={32} color={color} accessible={false} />
      )}
      <Text
        variant="sectionTitle"
        accessibilityRole={kind === 'error' ? 'alert' : 'header'}
        className={cn('text-center', immersive && 'text-v2-sessionText')}
      >
        {title}
      </Text>
      {description && (
        <Text
          className={cn(
            'text-center',
            immersive ? 'text-v2-sessionSecondary' : 'text-v2-secondary',
          )}
        >
          {description}
        </Text>
      )}
      {kind !== 'loading' && action && (
        <Button
          {...action}
          variant={immersive ? 'immersive' : 'primary'}
          className="self-stretch"
        />
      )}
    </View>
  );
});
