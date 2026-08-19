import { requireUser } from '@/lib/auth-server';
import type { ReactNode } from 'react';

export default async function PrintLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <div data-print-shell className="min-h-screen bg-background text-foreground">
      <main
        aria-label="Relatório imprimível"
        className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8"
      >
        {children}
      </main>
    </div>
  );
}
