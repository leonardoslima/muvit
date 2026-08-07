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
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardPlus,
  Dumbbell,
  HeartPulse,
  ShieldPlus,
  Sparkles,
  Target,
  UserRound,
  X,
} from 'lucide-react';
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
  trainingDays: '',
  restrictions: '',
  internalNotes: '',
};

const steps = ['Informações básicas', 'Objetivos', 'Concluído'] as const;
const goals = [
  { label: 'Hipertrofia', icon: Dumbbell },
  { label: 'Emagrecimento', icon: Sparkles },
  { label: 'Resistência', icon: Activity },
  { label: 'Força', icon: Target },
  { label: 'Reabilitação', icon: ShieldPlus },
  { label: 'Condicionamento geral', icon: HeartPulse },
] as const;
const trainingDays = ['2', '3', '4', '5', '6'] as const;

export function StudentWizard({ action }: StudentWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<StudentWizardDraft>(initialDraft);
  const [errors, setErrors] = useState<StudentWizardErrors>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const firstGoalRef = useRef<HTMLButtonElement>(null);
  const firstTrainingDayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (step === 1 && errors.name) nameRef.current?.focus();
    if (step === 2 && errors.goals) firstGoalRef.current?.focus();
    if (step === 2 && !errors.goals && errors.trainingDays) firstTrainingDayRef.current?.focus();
  }, [errors.goals, errors.name, errors.trainingDays, step]);

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

  const createStudent = () => {
    if (submittingRef.current) return;
    const nextErrors = validateGoalsStep(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.goals) firstGoalRef.current?.focus();
      else if (nextErrors.trainingDays) firstTrainingDayRef.current?.focus();
      return;
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(buildCreateStudentPayload(draft))) {
      if (value !== undefined) formData.set(key, value);
    }

    submittingRef.current = true;
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await action(null, formData);
        if (result?.fieldErrors) {
          setErrors(result.fieldErrors);
          setStep(1);
          return;
        }
        if (result?.error || !result?.studentId) {
          setActionError(result?.error ?? 'Não foi possível cadastrar o aluno.');
          return;
        }
        setStudentId(result.studentId);
        setStep(3);
      } catch {
        setActionError('Não foi possível cadastrar o aluno.');
      } finally {
        submittingRef.current = false;
      }
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createStudent();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header
        data-wizard-topbar
        className="grid h-18 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-card px-4 sm:px-12"
      >
        <Link
          href="/students"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
          <span className="hidden sm:inline">Fechar</span>
        </Link>
        <Progress step={step} />
        <span className="justify-self-end text-xs text-muted-foreground sm:text-sm">
          Precisa de ajuda?
        </span>
      </header>

      <main className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-8 sm:py-12 lg:py-16">
        {step === 1 && (
          <Card className="w-full max-w-150 gap-0 overflow-hidden p-0">
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
          <Card className="w-full max-w-150 gap-0 overflow-hidden p-0">
            <WizardHeader
              title="Objetivos e restrições"
              subtitle="Registre o contexto necessário para personalizar o acompanhamento."
            />
            <form onSubmit={submit} noValidate>
              <div className="flex flex-col gap-6 p-6 sm:p-8">
                <fieldset className="flex flex-col gap-3">
                  <legend className="font-display text-[11px] font-semibold uppercase tracking-[0.08em]">
                    Objetivo principal
                  </legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {goals.map(({ label, icon: Icon }, index) => (
                      <button
                        key={label}
                        ref={index === 0 ? firstGoalRef : undefined}
                        type="button"
                        aria-pressed={draft.goals === label}
                        onClick={() => update('goals', label)}
                        className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-[10px] border border-border p-3 text-center text-xs font-semibold transition-colors aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary hover:border-primary"
                      >
                        <Icon className="size-5" />
                        {label}
                      </button>
                    ))}
                  </div>
                  {errors.goals && (
                    <p role="alert" className="text-xs text-destructive">
                      {errors.goals}
                    </p>
                  )}
                </fieldset>

                <fieldset
                  className="flex flex-col gap-2"
                  aria-invalid={!!errors.trainingDays}
                  aria-describedby={errors.trainingDays ? 'training-days-error' : undefined}
                >
                  <legend className="font-display text-[11px] font-semibold uppercase tracking-[0.08em]">
                    Dias de treino por semana
                  </legend>
                  <div className="grid grid-cols-5 gap-1 rounded-md bg-muted p-1">
                    {trainingDays.map((day) => (
                      <button
                        key={day}
                        ref={day === trainingDays[0] ? firstTrainingDayRef : undefined}
                        type="button"
                        aria-pressed={draft.trainingDays === day}
                        onClick={() => update('trainingDays', day)}
                        className="h-9 rounded text-sm font-semibold aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                      >
                        {day} dias
                      </button>
                    ))}
                  </div>
                  {errors.trainingDays && (
                    <p id="training-days-error" role="alert" className="text-xs text-destructive">
                      {errors.trainingDays}
                    </p>
                  )}
                </fieldset>

                <TextAreaField
                  label="Restrições físicas ou lesões"
                  name="restrictions"
                  value={draft.restrictions}
                  onChange={(value) => update('restrictions', value)}
                  placeholder="Ex.: Dor no joelho durante agachamentos"
                />
                <TextAreaField
                  label="Notas internas"
                  name="internalNotes"
                  value={draft.internalNotes}
                  onChange={(value) => update('internalNotes', value)}
                  placeholder="Observações privadas do treinador"
                />
                {actionError && (
                  <div
                    role="alert"
                    className="flex flex-col items-start gap-2 rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>{actionError}</span>
                    <Button type="button" variant="secondary" size="sm" onClick={createStudent}>
                      Tentar novamente
                    </Button>
                  </div>
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
          <Card className="w-full max-w-150 items-center gap-6 p-6 text-center sm:p-12">
            <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="size-9" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold">Aluno cadastrado com sucesso</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {draft.name.trim()} já está disponível na sua lista de alunos.
              </p>
            </div>
            <div className="flex w-full items-center gap-4 rounded-[10px] bg-muted p-5 text-left">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {initials(draft.name)}
              </span>
              <div>
                <p className="font-display font-semibold">{draft.name.trim()}</p>
                <p className="text-sm text-muted-foreground">
                  {draft.goals} · {draft.trainingDays}x por semana
                </p>
              </div>
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
      </main>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <nav
      aria-label="Progresso do cadastro"
      className="max-w-[70vw] overflow-x-auto"
      aria-live="polite"
    >
      <span className="sr-only">Etapa {step} de 3</span>
      <ol className="flex min-w-max items-center gap-2 text-xs sm:gap-4 sm:text-sm">
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
                className={`flex size-6 items-center justify-center rounded-full font-semibold ${number <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >
                {complete ? <Check className="size-3.5" /> : number}
              </span>
              <span className={number <= step ? 'font-medium' : 'text-muted-foreground'}>
                {label}
              </span>
              {number < 3 && <span className="h-px w-5 bg-border sm:w-8" />}
            </li>
          );
        })}
      </ol>
    </nav>
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
type TextAreaFieldProps = Omit<WizardFieldProps, 'type' | 'className' | 'error' | 'required'> & {
  placeholder?: string;
};
function TextAreaField({ label, name, value, onChange, placeholder }: TextAreaFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
        className="min-h-20 resize-y rounded-md border border-input bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
      />
    </div>
  );
}
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
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
