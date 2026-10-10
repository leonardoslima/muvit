import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '../../../lib/design-system/cn';

export type SkeletonProps = ViewProps & { variant?: 'default' | 'immersive'; className?: string };
export const Skeleton = forwardRef<View, SkeletonProps>(function Skeleton(
  { variant = 'default', className, ...props },
  ref,
) {
  return (
    <View
      {...props}
      ref={ref}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn(
        'h-[14px] w-full rounded-[4px]',
        variant === 'immersive' ? 'bg-v2-sessionRaised' : 'bg-v2-subtle',
        className,
      )}
    />
  );
});
