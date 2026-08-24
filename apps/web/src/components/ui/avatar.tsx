'use client';

import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';
import { useState } from 'react';

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
  src?: string | null;
}

function Avatar({
  name,
  src,
  size = 'md',
  className,
  role = 'img',
  'aria-label': ariaLabel = `Avatar de ${name}`,
  ...props
}: AvatarProps) {
  const safeSrc = getSafeImageSource(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = safeSrc !== null && safeSrc !== failedSrc;

  return (
    <span
      className={cn(
        avatarVariants({ size }),
        'relative overflow-hidden',
        pickTone(name),
        className,
      )}
      role={role}
      aria-label={ariaLabel}
      {...props}
    >
      {getInitials(name)}
      {showImage && (
        <img
          src={safeSrc}
          alt=""
          aria-hidden="true"
          width={48}
          height={48}
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailedSrc(safeSrc)}
        />
      )}
    </span>
  );
}

function getSafeImageSource(src: string | null | undefined): string | null {
  if (!src) return null;
  try {
    const url = new URL(src);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export { Avatar, avatarVariants };
