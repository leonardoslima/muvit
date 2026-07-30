'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Save, Upload } from 'lucide-react';
import Link from 'next/link';
import { type ChangeEventHandler, type ReactNode, useActionState, useState } from 'react';
import { type AssessmentState, createAssessmentAction } from './actions';

const MEASUREMENT_FIELDS = [
  ['Peito', 'chest'],
  ['Cintura', 'waist'],
  ['Quadril', 'hip'],
  ['Braço direito', 'armRight'],
  ['Braço esquerdo', 'armLeft'],
  ['Coxa direita', 'thighRight'],
  ['Coxa esquerda', 'thighLeft'],
  ['Panturrilha direita', 'calfRight'],
  ['Panturrilha esquerda', 'calfLeft'],
] as const;

export function AssessmentForm({ studentId }: { studentId: string }) {
  const action = createAssessmentAction.bind(null, studentId);
  const [state, formAction, pending] = useActionState<AssessmentState, FormData>(action, null);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const weightValue = Number(weight);
  const heightValue = Number(height);
  const bmi =
    weightValue > 0 && heightValue > 0
      ? weightValue / ((heightValue / 100) * (heightValue / 100))
      : null;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <FormCard title="Métricas principais">
          <MetricField
            label="Data da avaliação"
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
          <MetricField
            label="Peso"
            name="weightKg"
            type="number"
            step="0.1"
            unit="kg"
            onChange={(event) => setWeight(event.target.value)}
          />
          <MetricField
            label="Altura"
            name="heightCm"
            type="number"
            step="0.1"
            unit="cm"
            onChange={(event) => setHeight(event.target.value)}
          />
          <MetricField
            label="Percentual de gordura"
            name="bodyFatPct"
            type="number"
            step="0.1"
            unit="%"
          />
          <div className="flex flex-col gap-1.5">
            <span className="font-sans text-[13px] font-medium">
              IMC (calculado automaticamente)
            </span>
            <output
              aria-live="polite"
              className="flex h-11 items-center rounded-md bg-muted px-3.5 text-sm font-medium text-muted-foreground"
            >
              {bmi === null
                ? '—'
                : bmi.toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
            </output>
            <p className="text-xs text-muted-foreground">Calculado a partir da altura e do peso</p>
          </div>
        </FormCard>

        <FormCard title="Medidas de circunferência" subtitle="(cm)">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            {MEASUREMENT_FIELDS.map(([label, name]) => (
              <CompactField key={name} label={label} name={name} />
            ))}
          </div>
        </FormCard>
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-2.5 border-b border-border px-6 py-5">
          <Camera className="size-[18px]" />
          <h2 className="font-display text-base font-semibold">Fotos de progresso</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
          <PhotoUploadField label="Foto frontal" name="photoFront" />
          <PhotoUploadField label="Foto posterior" name="photoBack" />
          <PhotoUploadField label="Foto lateral" name="photoSide" />
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-border px-6 py-5">
          <h2 className="font-display text-base font-semibold">Observações</h2>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            opcional
          </span>
        </div>
        <div className="p-6">
          <Label htmlFor="notes" className="sr-only">
            Observações da avaliação
          </Label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Adicione observações, anotações do treinador ou feedback do aluno..."
            className="min-h-24 w-full resize-y rounded-md border border-input bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
      </Card>

      {state?.error && (
        <p className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Button asChild variant="secondary">
          <Link href={`/students/${studentId}`}>Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          <Save />
          {pending ? 'Salvando...' : 'Salvar avaliação'}
        </Button>
      </div>
    </form>
  );
}

function FormCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-baseline gap-2 border-b border-border px-6 py-5">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {subtitle && <span className="text-[13px] text-muted-foreground">{subtitle}</span>}
      </div>
      <div className="flex flex-col gap-5 p-6">{children}</div>
    </Card>
  );
}

function MetricField({
  label,
  name,
  type = 'text',
  step,
  unit,
  required,
  defaultValue,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  unit?: string;
  required?: boolean;
  defaultValue?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={name}
        className="font-sans text-[13px] font-medium normal-case tracking-normal"
      >
        {label}
      </Label>
      {unit ? (
        <div className="flex h-11 overflow-hidden rounded-md border border-input bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Input
            id={name}
            name={name}
            type={type}
            step={step}
            required={required}
            defaultValue={defaultValue}
            onChange={onChange}
            className="h-full rounded-none border-0 focus-visible:border-transparent focus-visible:ring-0"
          />
          <span className="flex min-w-12 items-center justify-center border-l border-border bg-muted px-3 text-[13px] font-medium text-muted-foreground">
            {unit}
          </span>
        </div>
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          step={step}
          required={required}
          defaultValue={defaultValue}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function CompactField({ label, name }: { label: string; name: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="font-sans text-xs font-medium normal-case tracking-normal">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type="number"
        step="0.1"
        placeholder="Não medido"
        className="h-10 px-3 text-[13px]"
      />
    </div>
  );
}

function PhotoUploadField({ label, name }: { label: string; name: string }) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div>
      <input
        id={name}
        name={name}
        type="file"
        accept="image/jpeg,image/png"
        aria-label={label}
        className="sr-only"
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
      />
      <Label
        htmlFor={name}
        className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[10px] border border-dashed border-border px-5 py-8 text-center normal-case tracking-normal transition-colors hover:border-primary hover:bg-muted/50"
      >
        <Upload className="size-7 text-muted-foreground" />
        <span className="font-sans text-sm font-semibold text-foreground">{label}</span>
        <span className="max-w-full truncate font-sans text-xs font-normal text-muted-foreground">
          {fileName ?? 'Arraste ou clique para enviar'}
        </span>
      </Label>
    </div>
  );
}
