'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmailVerification } from '@/lib/use-email-verification';
import Link from 'next/link';
import type { FormEvent } from 'react';

export default function VerifyEmailPage() {
  const { user, loading, pending, sent, cooldown, error, send, refresh, signOut } =
    useEmailVerification();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(String(new FormData(event.currentTarget).get('email') ?? ''));
  }
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Confirme seu e-mail</h1>
        <p className="text-sm text-muted-foreground">
          Confirme seu endereço para acessar seus dados no Muvit.
        </p>
      </header>
      {loading ? (
        <p>Consultando sessão…</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5" aria-busy={pending}>
          {user ? (
            <p className="text-sm">Conta: {user.email}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={pending}
              />
            </div>
          )}
          {sent && (
            <output className="text-sm">
              Se houver uma conta pendente com esse e-mail, um link de confirmação será enviado.
            </output>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending || cooldown > 0} size="lg">
            {pending ? 'Enviando…' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Enviar link'}
          </Button>
        </form>
      )}
      {user ? (
        <>
          <Button variant="secondary" onClick={() => void refresh(true)} disabled={loading}>
            Já confirmei
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            Sair da conta
          </Button>
        </>
      ) : (
        <Link
          href="/login"
          className="text-center text-sm font-semibold text-primary hover:underline"
        >
          Voltar para entrar
        </Link>
      )}
    </div>
  );
}
