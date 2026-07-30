import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';

const avatarVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-pill font-display font-semibold text-primary-foreground',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

const TONES = ['bg-primary', 'bg-secondary', 'bg-muted text-foreground', 'bg-foreground text-card'];

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function pickTone(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

interface AvatarProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  name: string;
}

function Avatar({ name, size = 'md', className, ...props }: AvatarProps) {
  return (
    <span className={cn(avatarVariants({ size }), pickTone(name), className)} {...props}>
      {getInitials(name)}
    </span>
  );
}

export { Avatar, avatarVariants };
