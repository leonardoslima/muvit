'use client';

import { Avatar } from '@/components/ui/avatar';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const LOGOUT_ERROR_MESSAGE = 'Não foi possível sair. Tente novamente.';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/students', icon: Users, label: 'Alunos' },
  { href: '/workouts', icon: ClipboardList, label: 'Treinos' },
  { href: '/exercises', icon: Dumbbell, label: 'Exercícios' },
  { href: '/reports', icon: BarChart3, label: 'Relatórios' },
  { href: '/settings/profile', icon: Settings, label: 'Configurações', matchPrefix: '/settings' },
];

interface SidebarProps {
  user: { name: string; email: string } | null;
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

export function Sidebar({ user, variant = 'desktop', onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string>();

  async function handleLogout(): Promise<void> {
    if (loggingOut) {
      return;
    }

    setLogoutError(undefined);
    setLoggingOut(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setLogoutError(LOGOUT_ERROR_MESSAGE);
        return;
      }

      router.replace('/login');
      router.refresh();
    } catch {
      setLogoutError(LOGOUT_ERROR_MESSAGE);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside
      className={cn(
        'shrink-0 flex-col justify-between bg-sidebar py-8 text-sidebar-foreground',
        variant === 'desktop' ? 'hidden w-[260px] lg:flex' : 'flex h-full w-full',
      )}
    >
      <div className="flex flex-col gap-8">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-6">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary font-display text-base font-bold text-primary-foreground">
            M
          </span>
          <span className="font-display text-xl font-bold tracking-[0.1em] text-sidebar-foreground">
            MUVIT
          </span>
        </Link>

        <nav aria-label="Navegação principal" className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const activePrefix = item.matchPrefix ?? item.href;
            const active = pathname === item.href || pathname.startsWith(`${activePrefix}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-11 items-center gap-3 px-6 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-foreground before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary'
                    : 'text-sidebar-muted hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
                )}
              >
                <Icon className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        <div className="mx-6 border-t border-sidebar-border" />
        <div className="flex items-center gap-3 px-6">
          {user && (
            <>
              <Avatar name={user.name} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-display text-sm font-semibold text-sidebar-foreground">
                  {user.name}
                </span>
                <span className="truncate text-xs text-sidebar-muted">{user.email}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-sidebar-muted hover:text-sidebar-foreground disabled:opacity-50"
                aria-label="Sair"
              >
                <LogOut className="size-4" />
              </button>
            </>
          )}
        </div>
        {logoutError && (
          <p role="alert" className="px-6 text-xs text-destructive">
            {logoutError}
          </p>
        )}
      </div>
    </aside>
  );
}
