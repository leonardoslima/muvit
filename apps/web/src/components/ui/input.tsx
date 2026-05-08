import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        'flex h-11 w-full rounded-md border border-input bg-card px-4 text-sm text-foreground placeholder:text-[#888888] outline-none transition-colors',
        'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
        'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60',
        'aria-invalid:border-destructive aria-invalid:bg-destructive-bg aria-invalid:focus-visible:ring-destructive/20',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
