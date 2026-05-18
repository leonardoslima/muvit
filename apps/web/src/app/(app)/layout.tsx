import { Sidebar } from '@/components/sidebar';
import { requireUser } from '@/lib/auth-server';
import type { ReactNode } from 'react';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="flex flex-col gap-7 px-10 py-8">{children}</div>
      </main>
    </div>
  );
}
