import { ArrowLeft, RotateCw, X } from 'lucide-react-native';
import { type ReactNode, forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { colors, controlSizes } from '../../../lib/design-system/tokens';
import type { Action } from './control';
import { IconButton } from './icon-button';
import { Text } from './text';

export type HeaderProps = ViewProps & {
  title: string;
  variant?: 'default' | 'contextual' | 'session';
  backAction?: Action;
  backIcon?: ReactNode;
  action?: Action;
  className?: string;
  titleClassName?: string;
};
export const Header = forwardRef<View, HeaderProps>(function Header(
  { title, variant = 'default', backAction, backIcon, action, className, titleClassName, ...props },
  ref,
) {
  const session = variant === 'session';
  const color = session ? colors.sessionText : colors.brand;
  const BackIcon = session ? X : ArrowLeft;
  return (
    <View
      {...props}
      ref={ref}
      className={cn('flex-row items-center gap-4', session && 'bg-v2-sessionBackground', className)}
    >
      {(backAction || session) && (
        <View className="w-[48px] shrink-0">
          {backAction && (
            <IconButton
              {...backAction}
              accessibilityLabel={backAction.label}
              variant={session ? 'immersive' : 'secondary'}
              className={session ? 'bg-v2-sessionRaised' : undefined}
              icon={backIcon ?? <BackIcon size={controlSizes.icon} color={color} />}
            />
          )}
        </View>
      )}
      <Text
        accessibilityRole="header"
        variant={session ? 'action' : 'screenTitle'}
        className={cn(
          'flex-1',
          session && 'text-center text-v2-sessionText font-v2-semibold',
          titleClassName,
        )}
      >
        {title}
      </Text>
      {(action || session) && (
        <View className="w-[48px] shrink-0">
          {action && (
            <IconButton
              {...action}
              accessibilityLabel={action.label}
              variant={session ? 'immersive' : 'secondary'}
              icon={<RotateCw size={controlSizes.icon} color={color} />}
            />
          )}
        </View>
      )}
    </View>
  );
});
