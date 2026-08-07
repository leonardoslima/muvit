'use client';

import {
  type StudentWizardDraft,
  type StudentWizardErrors,
  buildCreateStudentPayload,
  validateBasicStep,
  validateGoalsStep,
} from '@/application/students/student-wizard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Check, ClipboardPlus, Dumbbell, UserRound } from 'lucide-react';
import Link from 'next/link';
import {
  type FormEvent,
  type ReactNode,
  forwardRef,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';

type CreateStudentResult = {
  studentId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

type StudentWizardProps = {
  action: (state: CreateStudentResult, formData: FormData) => Promise<CreateStudentResult>;
};

const initialDraft: StudentWizardDraft = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  gender: '',
  goals: '',
  restrictions: '',
};

const steps = ['Informações básicas', 'Objetivos', 'Concluído'] as const;

export function StudentWizard({ action }: StudentWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<StudentWizardDraft>(initialDraft);
  const [errors, setErrors] = useState<StudentWizardErrors>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const goalsRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (step === 1 && errors.name) nameRef.current?.focus();
    if (step === 2 && errors.goals) goalsRef.current?.focus();
  }, [errors.goals, errors.name, step]);

  const update = (field: keyof StudentWizardDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const continueToGoals = () => {
    const nextErrors = validateBasicStep(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      nameRef.current?.focus();
      return;
    }
    setStep(2);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateGoalsStep(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      goalsRef.current?.focus();
      return;
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(buildCreateStudentPayload(draft))) {
      if (value !== undefined) formData.set(key, value);
    }

    setActionError(null);
    startTransition(async () => {
      const result = await action(null, formData);
      if (result?.fieldErrors) {
        setErrors(result.fieldErrors);
        setStep(1);
        nameRef.current?.focus();
        return;
      }
      if (result?.error || !result?.studentId) {
        setActionError(result?.error ?? 'Não foi possível cadastrar o aluno.');
        return;
      }
      setStudentId(result.studentId);
      setStep(3);
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6" data-responsive-layout="stacked">
      <nav aria-label="Progresso do cadastro" className="overflow-x-auto" aria-live="polite">
        <span className="sr-only">Etapa {step} de 3</span>
        <ol className="flex min-w-max items-center justify-center gap-3 text-xs sm:gap-4 sm:text-sm">
          {steps.map((label, index) => {
            const number = index + 1;
            const complete = number < step || step === 3;
            return (
              <li
                key={label}
                aria-current={number === step ? 'step' : undefined}
                className="flex items-center gap-2"
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full font-semibold ${number <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {complete ? <Check className="size-4" aria-hidden="true" /> : number}
                </span>
                <span
                  className={
                    number <= step ? 'font-medium text-foreground' : 'text-muted-foreground'
                  }
                >
                  {label}
                </span>
                {number < 3 && <span className="h-px w-5 bg-border sm:w-8" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </nav>

      {step === 1 && (
        <Card className="gap-0 overflow-hidden p-0">
          <WizardHeader
            title="Informações básicas"
            subtitle="Comece pelos dados principais de contato do aluno."
          />
          <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 sm:p-8">
            <WizardField
              ref={nameRef}
              label="Nome completo"
              name="name"
              value={draft.name}
              onChange={(value) => update('name', value)}
              error={errors.name}
              required
              className="sm:col-span-2"
            />
            <WizardField
              label="E-mail"
              name="email"
              type="email"
              value={draft.email}
              onChange={(value) => update('email', value)}
              error={errors.email}
            />
            <WizardField
              label="Telefone / WhatsApp"
              name="phone"
              value={draft.phone}
              onChange={(value) => update('phone', value)}
            />
            <WizardField
              label="Data de nascimento"
              name="birthDate"
              type="date"
              value={draft.birthDate}
              onChange={(value) => update('birthDate', value)}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gender">Gênero</Label>
              <select
                id="gender"
                value={draft.gender}
                onChange={(event) => update('gender', event.target.value)}
                className="h-11 rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="">Não informar</option>
                <option value="female">Feminino</option>
                <option value="male">Masculino</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end border-t border-border p-6 sm:px-8">
            <Button type="button" onClick={continueToGoals}>
              Continuar
              <ArrowRight />
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="gap-0 overflow-hidden p-0">
          <WizardHeader
            title="Objetivos e restrições"
            subtitle="Registre o contexto necessário para personalizar o acompanhamento."
          />
          <form onSubmit={submit} noValidate>
            <div className="flex flex-col gap-5 p-6 sm:p-8">
              <TextAreaField
                ref={goalsRef}
                label="Objetivo principal"
                name="goals"
                value={draft.goals}
                onChange={(value) => update('goals', value)}
                error={errors.goals}
                placeholder="Ex.: Hipertrofia; nível intermediário"
                required
              />
              <TextAreaField
                label="Restrições físicas ou lesões"
                name="restrictions"
                value={draft.restrictions}
                onChange={(value) => update('restrictions', value)}
                placeholder="Ex.: Dor no joelho durante agachamentos"
              />
              {actionError && (
                <p
                  role="alert"
                  className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive"
                >
                  {actionError}
                </p>
              )}
            </div>
            <div className="flex flex-col-reverse justify-between gap-3 border-t border-border p-6 sm:flex-row sm:px-8">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                <ArrowLeft />
                Voltar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Cadastrando…' : 'Cadastrar aluno'}
                {!pending && <ArrowRight />}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {step === 3 && studentId && (
        <Card className="items-center gap-6 p-6 text-center sm:p-10">
          <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="size-9" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">Aluno cadastrado com sucesso</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {draft.name.trim()} já está disponível na sua lista de alunos.
            </p>
          </div>
          <div className="grid w-full gap-3 text-left sm:grid-cols-2">
            <NextStepLink
              href={`/workouts?studentId=${studentId}`}
              icon={<Dumbbell />}
              title="Criar treino agora"
            />
            <NextStepLink
              href={`/students/${studentId}/assessments/new`}
              icon={<ClipboardPlus />}
              title="Registrar avaliação"
            />
          </div>
          <Button asChild variant="secondary">
            <Link href={`/students/${studentId}`}>
              <UserRound />
              Ver perfil do aluno
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}

function WizardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="border-b border-border p-6 sm:px-8 sm:py-7">
      <h1 className="font-display text-xl font-bold">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
    </header>
  );
}

type WizardFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
  className?: string;
};

const WizardField = forwardRef<HTMLInputElement, WizardFieldProps>(function WizardField(
  { label, name, value, onChange, error, type = 'text', required, className },
  ref,
) {
  const errorId = `${name}-error`;
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        ref={ref}
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
});

type TextAreaFieldProps = Omit<WizardFieldProps, 'type' | 'className'> & { placeholder?: string };

const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, name, value, onChange, error, placeholder, required },
  ref,
) {
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        ref={ref}
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        placeholder={placeholder}
        className="min-h-24 resize-y rounded-md border border-input bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
});

function NextStepLink({ href, icon, title }: { href: string; icon: ReactNode; title: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[10px] border border-border p-4 font-display text-sm font-semibold transition-colors hover:border-primary hover:bg-muted/50"
    >
      <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:size-5">
        {icon}
      </span>
      {title}
      <ArrowRight className="ml-auto size-4" />
    </Link>
  );
}
