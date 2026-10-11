import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { TextClassContext } from './text';

export type SurfaceVariant = 'default' | 'subtle' | 'immersive' | 'raised';
const variants: Record<SurfaceVariant, string> = {
  default: 'bg-v2-surface',
  subtle: 'bg-v2-subtle',
  immersive: 'bg-v2-sessionSurface',
  raised: 'bg-v2-sessionRaised',
};
export type SurfaceProps = ViewProps & { variant?: SurfaceVariant; className?: string };
export const Surface = forwardRef<View, SurfaceProps>(function Surface(
  { variant = 'default', className, ...props },
  ref,
) {
  return (
    <TextClassContext.Provider
      value={
        variant === 'immersive' || variant === 'raised' ? 'text-v2-sessionText' : 'text-v2-text'
      }
    >
      <View {...props} ref={ref} className={cn(variants[variant], className)} />
    </TextClassContext.Provider>
  );
});
