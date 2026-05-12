import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'on-dark';
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' };

export function Logo({ className, variant = 'default', size = 'md' }: LogoProps) {
  return (
    <span
      className={cn(
        'font-display font-bold tracking-[0.2em]',
        variant === 'on-dark' ? 'text-mkt-on-dark' : 'text-primary',
        SIZE[size],
        className,
      )}
    >
      MUVIT
    </span>
  );
}
