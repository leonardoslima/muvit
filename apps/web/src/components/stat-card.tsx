import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const ACCENT = {
  primary: 'text-primary bg-success-bg',
  warning: 'text-[#B87A0A] bg-warning-bg',
  info: 'text-info bg-info-bg',
  success: 'text-primary bg-success-bg',
  destructive: 'text-destructive bg-destructive-bg',
} as const;

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  accent?: keyof typeof ACCENT;
}

export function StatCard({ label, value, hint, icon: Icon, accent = 'primary' }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <span className={cn('grid size-8 place-items-center rounded-md', ACCENT[accent])}>
          <Icon className="size-4" />
        </span>
      </div>
      <span className="font-display text-[32px] font-bold leading-none">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
