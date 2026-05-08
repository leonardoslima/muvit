'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { loginAction, type LoginState } from './actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, null);
  const [role, setRole] = useState<'trainer' | 'student'>('trainer');

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
        <p className="text-sm text-muted-foreground">
          Entre na sua conta para acessar o painel.
        </p>
      </header>

      <div className="grid grid-cols-2 rounded-pill bg-muted p-1 text-sm font-display font-semibold">
        {(['trainer', 'student'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              'rounded-pill py-2 transition-colors',
              role === r ? 'bg-card text-foreground shadow-subtle' : 'text-muted-foreground',
            )}
          >
            {r === 'trainer' ? 'Personal' : 'Aluno'}
          </button>
        ))}
      </div>

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="role" value={role} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link href="#" className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-primary hover:underline">
              Esqueci
            </Link>
          </div>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {state?.error && (
          <p className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} size="lg">
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
