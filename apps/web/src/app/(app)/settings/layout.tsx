import { AppContentSurface } from '@/components/app-content-surface';
import { SettingsNavigation } from '@/components/settings-navigation';
import type { ReactNode } from 'react';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <AppContentSurface variant="fullHeight">
      <div className="flex min-h-full flex-col lg:flex-row">
        <aside className="border-b border-border bg-card px-4 py-6 lg:w-55 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-8">
          <SettingsNavigation />
        </aside>
        <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</section>
      </div>
    </AppContentSurface>
  );
}
