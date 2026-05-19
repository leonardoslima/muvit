'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState } from 'react';
import { type AssessmentState, createAssessmentAction } from './actions';

export function AssessmentForm({ studentId }: { studentId: string }) {
  const action = createAssessmentAction.bind(null, studentId);
  const [state, formAction, pending] = useActionState<AssessmentState, FormData>(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        <Field
          label="Data"
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
        <Field label="Peso (kg)" name="weightKg" type="number" step="0.1" />
        <Field label="Altura (cm)" name="heightCm" type="number" step="0.1" />
        <Field label="% Gordura" name="bodyFatPct" type="number" step="0.1" />
      </div>

      <div>
        <h3 className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Medidas (cm)
        </h3>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          <Field label="Peito" name="chest" type="number" step="0.1" />
          <Field label="Cintura" name="waist" type="number" step="0.1" />
          <Field label="Quadril" name="hip" type="number" step="0.1" />
          <div />
          <Field label="Braço D" name="armRight" type="number" step="0.1" />
          <Field label="Braço E" name="armLeft" type="number" step="0.1" />
          <Field label="Coxa D" name="thighRight" type="number" step="0.1" />
          <Field label="Coxa E" name="thighLeft" type="number" step="0.1" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notas</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="rounded-md border border-input bg-card px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="photo">Foto</Label>
        <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png" />
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? 'Salvando…' : 'Salvar avaliação'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  step,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue}
      />
    </div>
  );
}
