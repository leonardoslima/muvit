import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';

const logoVariants = cva('font-display font-bold tracking-[0.2em]', {
  variants: {
    variant: {
      default: 'text-primary',
      'on-dark': 'text-mkt-on-dark',
    },
    size: {
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

interface LogoProps extends VariantProps<typeof logoVariants> {
  className?: string;
}

export function Logo({ className, variant = 'default', size = 'md' }: LogoProps) {
  return <span className={cn(logoVariants({ variant, size, className }))}>MUVIT</span>;
}

export { logoVariants };
