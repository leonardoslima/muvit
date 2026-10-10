import { forwardRef } from 'react';
import type { View } from 'react-native';
import { cn } from '../../../lib/design-system/cn';
import { Surface, type SurfaceProps } from './surface';

export type SheetSurfaceProps = SurfaceProps;
export const SheetSurface = forwardRef<View, SheetSurfaceProps>(function SheetSurface(
  { className, ...props },
  ref,
) {
  return <Surface {...props} ref={ref} className={cn('gap-4 rounded-t-[24px] p-6', className)} />;
});
