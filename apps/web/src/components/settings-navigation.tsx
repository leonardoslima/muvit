'use client';

import { cn } from '@/lib/utils';
import { Bell, CreditCard, Puzzle, Shield, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';

type NavigationItem = {
  href?: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
};

const items: NavigationItem[] = [
  { href: '/settings/profile', icon: UserRound, label: 'Meu perfil' },
  { href: '/settings/notifications', icon: Bell, label: 'Notificações' },
  { href: '/settings/billing', icon: CreditCard, label: 'Plano e cobrança' },
  { icon: Puzzle, label: 'Integrações' },
  { icon: Shield, label: 'Privacidade e segurança' },
];

export function SettingsNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Configurações" className="flex flex-col gap-1">
      <h2 className="px-3 pb-3 font-display text-xl font-bold text-foreground">Configurações</h2>
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === pathname;
        const className = cn(
          'flex h-10 items-center gap-2.5 rounded-md px-3 font-display text-sm font-medium transition-colors',
          active
            ? 'border-l-3 border-primary bg-success-bg text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          !item.href &&
            'cursor-not-allowed opacity-60 hover:bg-transparent hover:text-muted-foreground',
        );
        const content = (
          <>
            <Icon className="size-[18px]" aria-hidden="true" />
            {item.label}
          </>
        );

        if (!item.href) {
          return (
            <span key={item.label} aria-disabled="true" className={className}>
              {content}
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={className}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
