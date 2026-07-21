'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type AuthRole, authClient } from '@/lib/auth-client';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

function getDestination(role: AuthRole): '/dashboard' | '/me' {
  return role === 'trainer' ? '/dashboard' : '/me';
}

function isAuthRole(value: unknown): value is AuthRole {
  return value === 'trainer' || value === 'student';
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
      setError('Informe e-mail e senha.');
      return;
    }

    setError(undefined);
    setPending(true);

    try {
      const result = await authClient.signIn.email({ email, password });
      const role = result.data?.user.role;

      if (result.error || !isAuthRole(role)) {
        setError(getAuthErrorMessage(result.error, 'login'));
        return;
      }

      router.replace(getDestination(role));
      router.refresh();
    } catch (requestError: unknown) {
      setError(getAuthErrorMessage(requestError, 'login'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
        <p className="text-sm text-muted-foreground">Entre na sua conta para acessar o painel.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="voce@exemplo.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              href="#"
              className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-primary hover:underline"
            >
              Esqueci
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        {error && (
          <p className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">{error}</p>
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
