'use client';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GetTrainerProfileResponse } from '@/lib/api/types.gen';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { type ProfileFormState, updateProfileAction } from './actions';

export function ProfileForm({ profile }: { profile: GetTrainerProfileResponse }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [router, state?.success]);

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6">
      <section className="rounded-[12px] bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={profile.name} size="lg" aria-label={`Avatar de ${profile.name}`} />
          <div className="min-w-0 flex-1">
            <Label htmlFor="avatarUrl">URL do avatar</Label>
            <Input
              id="avatarUrl"
              name="avatarUrl"
              type="url"
              defaultValue={profile.avatarUrl ?? ''}
              placeholder="https://..."
              className="mt-1.5"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Use uma imagem pública em formato URL.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[12px] bg-card p-5 shadow-card sm:p-6">
        <h2 className="font-display text-base font-semibold">Dados pessoais</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Nome"
            name="name"
            defaultValue={profile.name}
            required
            error={state?.fieldErrors?.name}
          />
          <Field
            label="E-mail"
            name="email"
            type="email"
            defaultValue={profile.email}
            required
            error={state?.fieldErrors?.email}
          />
          <Field label="Telefone" name="phone" type="tel" defaultValue={profile.phone ?? ''} />
          <Field
            label="Especialidades"
            name="specialties"
            defaultValue={profile.specialties.join(', ')}
            hint="Separe cada especialidade por vírgula."
          />
        </div>
        <div className="mt-5 flex flex-col gap-1.5">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            name="bio"
            rows={5}
            defaultValue={profile.bio ?? ''}
            className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
      </section>

      {state?.error && (
        <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.success && <output className="text-sm text-success">Perfil atualizado.</output>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save aria-hidden="true" />
          {pending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
  error,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
