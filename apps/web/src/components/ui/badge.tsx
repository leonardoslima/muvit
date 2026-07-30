import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';

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

const badgeDotVariants = cva('h-1.5 w-1.5 rounded-full', {
  variants: {
    variant: {
      active: 'bg-primary',
      inactive: 'bg-inactive',
      paused: 'bg-warning',
      info: 'bg-info',
      destructive: 'bg-destructive',
    },
  },
  defaultVariants: { variant: 'active' },
});

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = true, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={badgeDotVariants({ variant })} />}
      {children}
    </span>
  );
}

export { Badge, badgeDotVariants, badgeVariants };
