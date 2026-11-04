'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePasswordRecovery } from '@/lib/use-password-recovery';
import Link from 'next/link';
import type { FormEvent } from 'react';

export default function ForgotPasswordPage() {
  const { pending, success, error, requestReset } = usePasswordRecovery();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void requestReset(new FormData(event.currentTarget));
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">
          Informe seu e-mail para receber um link de recuperação.
        </p>
      </header>
      {success ? (
        <output className="text-sm text-foreground">
          Se houver uma conta com esse e-mail, você receberá um link para redefinir sua senha.
          Confira também a pasta de spam.
        </output>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={pending}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              disabled={pending}
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending} size="lg">
            {pending ? 'Enviando…' : 'Enviar link'}
          </Button>
        </form>
      )}
      <Link
        href="/login"
        className="text-center text-sm font-semibold text-primary hover:underline"
      >
        Voltar para entrar
      </Link>
    </div>
  );
}
