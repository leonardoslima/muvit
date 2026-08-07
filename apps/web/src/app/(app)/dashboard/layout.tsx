import { AppContentSurface } from '@/components/app-content-surface';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppContentSurface>{children}</AppContentSurface>;
}
