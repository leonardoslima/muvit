'use client';

import { Avatar } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Sidebar } from './sidebar';

interface MobileAppNavigationProps {
  user: { name: string; email: string; image?: string | null } | null;
}

export function MobileAppNavigation({ user }: MobileAppNavigationProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground lg:hidden">
      <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="Muvit - Dashboard">
        <span className="grid size-8 place-items-center rounded-md bg-primary font-display text-base font-bold text-primary-foreground">
          M
        </span>
        <span className="font-display text-lg font-bold tracking-[0.1em]">MUVIT</span>
      </Link>

      <div className="flex items-center gap-3">
        {user && (
          <Avatar
            name={user.name}
            src={user.image}
            size="sm"
            aria-label={`Perfil de ${user.name}`}
          />
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Abrir menu principal"
              className="grid size-10 place-items-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Menu className="size-5" />
            </button>
          </DialogTrigger>
          <DialogContent
            showCloseButton
            overlayClassName="bg-black/50"
            className="top-0 left-0 h-dvh max-w-[320px] translate-x-0 translate-y-0 overflow-y-auto rounded-none bg-sidebar p-0 ring-0 sm:max-w-[320px] data-[state=open]:slide-in-from-left data-[state=open]:zoom-in-100 data-[state=closed]:slide-out-to-left data-[state=closed]:zoom-out-100"
          >
            <DialogTitle className="sr-only">Menu principal</DialogTitle>
            <DialogDescription className="sr-only">
              Navegue pelas áreas autenticadas da Muvit.
            </DialogDescription>
            <Sidebar user={user} variant="mobile" onNavigate={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
