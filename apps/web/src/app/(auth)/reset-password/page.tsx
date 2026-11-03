'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePasswordRecovery } from '@/lib/use-password-recovery';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense } from 'react';

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const { pending, success, error, invalidToken, resetPassword } = usePasswordRecovery();
  const invalid = !token || params.has('error') || invalidToken;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!invalid) void resetPassword(new FormData(event.currentTarget), token);
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Redefinir senha</h1>
        <p className="text-sm text-muted-foreground">Escolha uma nova senha para sua conta.</p>
      </header>
      {invalid ? (
        <div className="flex flex-col gap-4">
          <p
            role="alert"
            className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive"
          >
            Link inválido ou expirado. Solicite um novo link para continuar.
          </p>
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Solicitar novo link
          </Link>
        </div>
      ) : success ? (
        <output className="text-sm text-foreground">
          Senha redefinida. Entre com sua nova senha.
        </output>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={pending}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              disabled={pending}
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="text-xs text-muted-foreground">
              De 8 a 128 caracteres.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmation">Confirmar nova senha</Label>
            <Input
              id="confirmation"
              name="confirmation"
              type="password"
              required
              maxLength={128}
              autoComplete="new-password"
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
            {pending ? 'Redefinindo…' : 'Redefinir senha'}
          </Button>
        </form>
      )}
      {!pending && (
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<output>Carregando…</output>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
