'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { signupAction, type SignupState } from './actions';

export default function SignupPage() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signupAction, null);
  const [role, setRole] = useState<'trainer' | 'student'>('trainer');
  const fe = state?.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Crie sua conta</h1>
        <p className="text-sm text-muted-foreground">
          Comece grátis. Sem cartão de crédito.
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
            {r === 'trainer' ? 'Sou personal' : 'Sou aluno'}
          </button>
        ))}
      </div>

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="role" value={role} />
        <Field label="Nome" name="name" type="text" required autoComplete="name" error={fe.name} />
        <Field label="E-mail" name="email" type="email" required autoComplete="email" error={fe.email} />
        <Field
          label="Senha"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          error={fe.password}
          hint="Mínimo de 8 caracteres."
        />
        {state?.error && (
          <p className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} size="lg">
          {pending ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  required,
  autoComplete,
  error,
  hint,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} data-error={!!error}>
        {label}
      </Label>
      <Input id={name} name={name} type={type} required={required} autoComplete={autoComplete} aria-invalid={!!error} />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
