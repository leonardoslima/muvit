import type { ReactNode } from 'react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <header className="flex flex-col items-start justify-between gap-4 sm:flex-row">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm capitalize text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && (
        <section
          aria-label="Ações da página"
          className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end"
        >
          {actions}
        </section>
      )}
    </header>
  );
}
