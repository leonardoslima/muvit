import { requireUser } from '@/lib/auth-server';
import type { ReactNode } from 'react';

export default async function WizardLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <div className="min-h-dvh bg-background">{children}</div>;
}
