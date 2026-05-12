'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState } from 'react';

export type StudentFormState = { error?: string; fieldErrors?: Record<string, string> } | null;

export type StudentFormValues = {
  id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  goals?: string | null;
  restrictions?: string | null;
  status?: 'active' | 'inactive' | 'paused';
};

interface Props {
  action: (state: StudentFormState, formData: FormData) => Promise<StudentFormState>;
  initial?: StudentFormValues;
  submitLabel?: string;
}

export function StudentForm({ action, initial, submitLabel = 'Salvar' }: Props) {
  const [state, formAction, pending] = useActionState<StudentFormState, FormData>(action, null);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Nome" name="name" defaultValue={initial?.name} required error={fe.name} />
        <Field
          label="E-mail"
          name="email"
          type="email"
          defaultValue={initial?.email ?? ''}
          error={fe.email}
        />
        <Field label="Telefone" name="phone" defaultValue={initial?.phone ?? ''} />
        <Field
          label="Data de nascimento"
          name="birthDate"
          type="date"
          defaultValue={initial?.birthDate ?? ''}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gender">Sexo</Label>
          <select
            id="gender"
            name="gender"
            defaultValue={initial?.gender ?? ''}
            className="h-11 rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="">Não informar</option>
            <option value="female">Feminino</option>
            <option value="male">Masculino</option>
            <option value="other">Outro</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? 'active'}
            className="h-11 rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextArea label="Objetivos" name="goals" defaultValue={initial?.goals ?? ''} />
        <TextArea
          label="Restrições"
          name="restrictions"
          defaultValue={initial?.restrictions ?? ''}
        />
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? 'Salvando…' : submitLabel}
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
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} data-error={!!error}>
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        required={required}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        rows={4}
        className="rounded-md border border-input bg-card px-3 py-2 text-sm resize-none"
      />
    </div>
  );
}
