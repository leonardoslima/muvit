import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden bg-mkt-hero p-12 lg:flex lg:flex-col lg:justify-between">
        <Logo variant="on-dark" size="lg" />
        <div className="flex flex-col gap-6 text-mkt-on-dark">
          <p className="font-display text-[44px] font-bold leading-[1.1] tracking-tight">
            A plataforma de treinos para personal trainers que querem crescer.
          </p>
          <p className="max-w-md text-base leading-relaxed text-mkt-on-dark-muted">
            Gerencie alunos, monte planos com biblioteca de exercícios e acompanhe a evolução —
            tudo num só lugar.
          </p>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-mkt-on-dark-muted">
          Beta · 2026
        </div>
      </aside>
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo size="md" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
