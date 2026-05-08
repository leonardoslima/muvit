import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-display text-[11px] font-semibold',
  {
    variants: {
      variant: {
        active: 'bg-success-bg text-[#1B7A3D]',
        inactive: 'bg-inactive-bg text-muted-foreground',
        paused: 'bg-warning-bg text-[#B87A0A]',
        info: 'bg-info-bg text-info',
        destructive: 'bg-destructive-bg text-destructive',
      },
    },
    defaultVariants: { variant: 'active' },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = true, children, ...props }: BadgeProps) {
  const dotColor =
    variant === 'inactive'
      ? 'bg-inactive'
      : variant === 'paused'
        ? 'bg-warning'
        : variant === 'info'
          ? 'bg-info'
          : variant === 'destructive'
            ? 'bg-destructive'
            : 'bg-primary';
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
