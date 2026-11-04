'use client';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GetTrainerProfileResponse } from '@/lib/api/types.gen';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ChangeEventHandler, useActionState, useEffect, useState } from 'react';
import { type ProfileFormState, updateProfileAction } from './actions';

export function ProfileForm({ profile }: { profile: GetTrainerProfileResponse }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    null,
  );
  const router = useRouter();
  const [values, setValues] = useState({
    avatarUrl: profile.avatarUrl ?? '',
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? '',
    specialties: profile.specialties.join(', '),
    bio: profile.bio ?? '',
  });

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [router, state?.success]);

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6">
      <section className="rounded-[12px] bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar
            name={values.name}
            src={values.avatarUrl}
            size="lg"
            aria-label={`Avatar de ${values.name}`}
          />
          <div className="min-w-0 flex-1">
            <Label htmlFor="avatarUrl">URL do avatar</Label>
            <Input
              id="avatarUrl"
              name="avatarUrl"
              type="url"
              value={values.avatarUrl}
              onChange={(event) => setValues({ ...values, avatarUrl: event.target.value })}
              placeholder="https://..."
              aria-invalid={!!state?.fieldErrors?.avatarUrl}
              aria-describedby={state?.fieldErrors?.avatarUrl ? 'avatarUrl-error' : undefined}
              className="mt-1.5"
            />
            {state?.fieldErrors?.avatarUrl && (
              <p id="avatarUrl-error" className="text-xs text-destructive">
                {state.fieldErrors.avatarUrl}
              </p>
            )}
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
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
            required
            error={state?.fieldErrors?.name}
          />
          <Field
            label="E-mail"
            name="email"
            type="email"
            value={values.email}
            onChange={(event) => setValues({ ...values, email: event.target.value })}
            required
            error={state?.fieldErrors?.email}
          />
          <Field
            label="Telefone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={(event) => setValues({ ...values, phone: event.target.value })}
            error={state?.fieldErrors?.phone}
          />
          <Field
            label="Especialidades"
            name="specialties"
            value={values.specialties}
            onChange={(event) => setValues({ ...values, specialties: event.target.value })}
            hint="Separe cada especialidade por vírgula."
            error={state?.fieldErrors?.specialties}
          />
        </div>
        <div className="mt-5 flex flex-col gap-1.5">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            name="bio"
            rows={5}
            value={values.bio}
            onChange={(event) => setValues({ ...values, bio: event.target.value })}
            aria-invalid={!!state?.fieldErrors?.bio}
            aria-describedby={state?.fieldErrors?.bio ? 'bio-error' : undefined}
            className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {state?.fieldErrors?.bio && (
            <p id="bio-error" className="text-xs text-destructive">
              {state.fieldErrors.bio}
            </p>
          )}
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
  value,
  onChange,
  required,
  error,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
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
        value={value}
        onChange={onChange}
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
