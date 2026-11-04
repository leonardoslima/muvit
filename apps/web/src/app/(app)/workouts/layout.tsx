import { AppContentSurface } from '@/components/app-content-surface';
import type { ReactNode } from 'react';

export default function WorkoutsLayout({ children }: { children: ReactNode }) {
  return <AppContentSurface variant="fullHeight">{children}</AppContentSurface>;
}
