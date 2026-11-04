import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface AppContentSurfaceProps {
  children: ReactNode;
  variant?: 'padded' | 'fullHeight';
}

export function AppContentSurface({ children, variant = 'padded' }: AppContentSurfaceProps) {
  return (
    <div
      data-app-content={variant === 'fullHeight' ? 'full-height' : 'padded'}
      className={cn(
        'flex min-h-full flex-col',
        variant === 'padded' && 'gap-7 px-4 py-6 sm:px-6 lg:px-10 lg:py-8',
      )}
    >
      {children}
    </div>
  );
}
