'use client';

import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/students', icon: Users, label: 'Alunos' },
  { href: '/exercises', icon: Dumbbell, label: 'Exercícios' },
  { href: '/workouts', icon: ClipboardList, label: 'Treinos' },
  { href: '/reports', icon: TrendingUp, label: 'Evolução' },
  { href: '/settings', icon: Settings, label: 'Configurações' },
];

export function Sidebar({ user }: { user: { name: string; email: string } | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-[260px] shrink-0 flex-col justify-between bg-sidebar py-8 text-sidebar-foreground">
      <div className="flex flex-col gap-8">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-6">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary font-display text-base font-bold text-primary-foreground">
            M
          </span>
          <span className="font-display text-xl font-bold tracking-[0.1em] text-sidebar-foreground">
            MUVIT
          </span>
        </Link>

        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
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
              <form action="/api/logout" method="post">
                <button
                  type="submit"
                  className="text-sidebar-muted hover:text-sidebar-foreground"
                  aria-label="Sair"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
