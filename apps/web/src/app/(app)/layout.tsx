import { MobileAppNavigation } from '@/components/mobile-app-navigation';
import { Sidebar } from '@/components/sidebar';
import { requireUser } from '@/lib/auth-server';
import type { ReactNode } from 'react';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div data-app-shell className="flex h-dvh flex-col overflow-hidden lg:flex-row">
      <MobileAppNavigation user={user} />
      <Sidebar user={user} />
      <main className="min-h-0 flex-1 overflow-y-auto bg-background">
        <div
          data-app-content
          className="flex min-h-full flex-col gap-7 px-4 py-6 sm:px-6 lg:px-10 lg:py-8"
        >
          {children}
        </div>
      </main>
    </div>
  );
}
