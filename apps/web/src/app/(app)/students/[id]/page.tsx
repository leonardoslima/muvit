import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { configureServerClient } from '@/lib/api-client';
import {
  getStudentsById,
  getStudentsByStudentIdAssessments,
  getStudentsByStudentIdWorkoutPlans,
} from '@/lib/api/sdk.gen';
import {
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Edit3,
  Eye,
  Mail,
  Phone,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { WeightEvolutionChart } from './_weight-evolution-chart';
import { deleteStudentAction } from './actions';

interface Props {
  params: Promise<{ id: string }>;
}

type Student = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  gender: 'male' | 'female' | 'other' | null;
  goals: string | null;
  restrictions: string | null;
  status: 'active' | 'inactive' | 'paused';
  isIndependent: boolean;
  createdAt: string;
};

type Assessment = {
  id: string;
  date: string;
  weightKg: string | number | null;
  heightCm?: string | number | null;
  bodyFatPct: string | number | null;
  measurements: AssessmentMeasurements | null;
  notes: string | null;
};

type AssessmentMeasurements = {
  chest?: number;
  waist?: number;
  hip?: number;
  armRight?: number;
  armLeft?: number;
  thighRight?: number;
  thighLeft?: number;
  calfRight?: number;
  calfLeft?: number;
};

type WorkoutPlan = {
  id: string;
  name: string;
  startDate: string | null;
  endDate?: string | null;
  status: 'active' | 'archived' | 'draft';
};

function toNum(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(date: string): string {
  const dateOnly = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('pt-BR');
  }

  return new Date(date).toLocaleDateString('pt-BR');
}

function formatMonthYear(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(
    new Date(date),
  );
}

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  const birthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

  return today.getFullYear() - birth.getFullYear() - (birthdayPassed ? 0 : 1);
}

function formatMetric(value: string | number | null | undefined, suffix: string): string {
  const metric = toNum(value ?? null);
  if (metric === null) return 'Sem registro';
  const separator = suffix.startsWith('%') ? '' : ' ';
  return `${metric}${separator}${suffix}`;
}

function formatStudentStatus(status: Student['status']): string {
  if (status === 'active') return 'Ativo';
  if (status === 'paused') return 'Pausado';
  return 'Inativo';
}

function formatStudentGender(gender: Student['gender']): string {
  if (gender === 'male') return 'Masculino';
  if (gender === 'female') return 'Feminino';
  if (gender === 'other') return 'Outro';
  return 'Não informado';
}

function formatWorkoutPeriod(plan: WorkoutPlan): string {
  if (!plan.startDate) return 'Sem data de início';
  const start = formatDate(plan.startDate);
  return plan.endDate ? `${start} - ${formatDate(plan.endDate)}` : `Início em ${start}`;
}

const trainingDays = [
  {
    key: 'A',
    name: 'Treino A — Superior empurrar',
    muscles: 'Peito · Ombros · Tríceps',
  },
  {
    key: 'B',
    name: 'Treino B — Superior puxar',
    muscles: 'Costas · Bíceps · Deltoide posterior',
  },
  {
    key: 'C',
    name: 'Treino C — Inferiores',
    muscles: 'Quadríceps · Posteriores · Glúteos · Panturrilhas',
  },
  {
    key: 'D',
    name: 'Treino D — Core + Cardio',
    muscles: 'Core · HIIT · Condicionamento',
  },
];

const measurementLabels: Array<{ key: keyof AssessmentMeasurements; label: string }> = [
  { key: 'waist', label: 'Cintura' },
  { key: 'hip', label: 'Quadril' },
  { key: 'armRight', label: 'Braço (D)' },
  { key: 'thighRight', label: 'Coxa (D)' },
  { key: 'chest', label: 'Peito' },
  { key: 'armLeft', label: 'Braço (E)' },
  { key: 'thighLeft', label: 'Coxa (E)' },
  { key: 'calfRight', label: 'Panturrilha (D)' },
  { key: 'calfLeft', label: 'Panturrilha (E)' },
];

function buildMeasurementRows(measurements: AssessmentMeasurements | null) {
  if (!measurements) return [];
  return measurementLabels.flatMap(({ key, label }) => {
    const value = measurements[key];
    return typeof value === 'number' ? [{ key, label, value: `${value} cm` }] : [];
  });
}

function formatChartMonth(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(date))
    .replace('.', '');
}

export function buildWeightChartPoints(assessments: Assessment[]) {
  return assessments
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((assessment) => ({
      date: assessment.date,
      label: formatChartMonth(assessment.date),
      weight: toNum(assessment.weightKg),
    }))
    .filter(
      (point): point is { date: string; label: string; weight: number } => point.weight !== null,
    );
}

export default async function StudentDetailPage({ params }: Props) {
  const { id } = await params;
  const client = await configureServerClient();
  const [res, assessmentsRes, workoutPlansRes] = await Promise.all([
    getStudentsById({ client, path: { id } }),
    getStudentsByStudentIdAssessments({
      client,
      path: { studentId: id },
      query: { limit: 6 },
    }),
    getStudentsByStudentIdWorkoutPlans({ client, path: { studentId: id } }),
  ]);
  if (res.error || !res.data) notFound();
  const s = res.data as Student;
  const assessments = ((assessmentsRes.data?.items ?? []) as Assessment[]).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const assessmentsLoadFailed = Boolean(assessmentsRes.error);
  const activeWorkoutPlans = ((workoutPlansRes.data?.items ?? []) as WorkoutPlan[]).filter(
    (plan) => plan.status === 'active',
  );
  const workoutPlansLoadFailed = Boolean(workoutPlansRes.error);
  const latestAssessment = assessments[0];
  const activeWorkoutPlan = activeWorkoutPlans[0];
  const age = calculateAge(s.birthDate);
  const statusLabel = formatStudentStatus(s.status);
  const studentType = s.isIndependent ? 'Independente' : 'Personal';
  const measurementRows = buildMeasurementRows(latestAssessment?.measurements ?? null);
  const weightChartPoints = buildWeightChartPoints(assessments);

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm font-medium">
        <Link href="/students" className="text-primary hover:text-primary-hover">
          Alunos
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">{s.name}</span>
      </nav>

      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={s.name} className="h-20 w-20 text-[28px]" />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[28px] font-bold leading-tight">{s.name}</h1>
              <Badge
                variant={
                  s.status === 'active' ? 'active' : s.status === 'paused' ? 'paused' : 'inactive'
                }
              >
                {statusLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {age ? `${age} anos` : 'Idade não informada'} · Objetivo: {s.goals ?? 'não informado'}{' '}
              · Cadastrado desde {formatMonthYear(s.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href={`/workouts/new?studentId=${s.id}`}>
              <Plus />
              Novo treino
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/students/${s.id}/assessments/new`}>
              <Plus />
              Nova avaliação
            </Link>
          </Button>
          <ConfirmationDialog
            trigger={
              <Button type="button" variant="ghost" size="icon" aria-label="Excluir aluno">
                <Trash2 />
              </Button>
            }
            title="Excluir aluno?"
            description={`Você está prestes a excluir ${s.name}. Esta ação não pode ser desfeita.`}
            confirmLabel="Excluir aluno"
            pendingLabel="Excluindo..."
            confirmAction={deleteStudentAction}
            hiddenFields={{ id: s.id }}
          />
        </div>
      </header>

      <nav
        aria-label="Seções do aluno"
        className="flex overflow-x-auto border-b border-border text-sm font-medium"
      >
        <a href="#overview" className="border-b-2 border-primary px-5 py-3 text-primary">
          Visão geral
        </a>
        <a href="#treino-ativo" className="px-5 py-3 text-muted-foreground hover:text-foreground">
          Treinos
        </a>
        <a
          href={`/students/${s.id}/assessments`}
          className="px-5 py-3 text-muted-foreground hover:text-foreground"
        >
          Avaliações
        </a>
      </nav>

      <div id="overview" className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="gap-0 overflow-hidden p-0">
          <CardHeader className="flex-row items-center justify-between border-b border-border px-5 py-4">
            <CardTitle>Informações pessoais</CardTitle>
            <Edit3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="gap-4 px-5 py-5">
            <InfoRow
              icon={<Mail className="size-4" />}
              label="Email"
              value={s.email ?? 'Não informado'}
            />
            <InfoRow
              icon={<Phone className="size-4" />}
              label="Telefone / WhatsApp"
              value={s.phone ?? 'Não informado'}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow label="Tipo" value={studentType} />
              <InfoRow label="Gênero" value={formatStudentGender(s.gender)} />
            </div>
            <InfoRow label="Objetivos" value={s.goals ?? 'Nenhum objetivo registrado.'} />
            <div className="flex flex-col gap-1.5">
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Restrições físicas
              </span>
              <div className="flex gap-2 rounded-lg border border-warning bg-warning-bg px-3.5 py-2.5 text-[#7A5C00]">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                <p className="text-sm leading-relaxed">
                  {s.restrictions ?? 'Nenhuma restrição registrada.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="treino-ativo" className="gap-0 overflow-hidden p-0">
          <CardHeader className="flex-row items-center justify-between border-b border-border px-5 py-4">
            <CardTitle>Treino ativo</CardTitle>
            <Badge variant={activeWorkoutPlan ? 'active' : 'paused'}>
              {activeWorkoutPlan ? 'Ativo' : 'Pendente'}
            </Badge>
          </CardHeader>
          <CardContent className="gap-4 px-5 py-5">
            {workoutPlansLoadFailed ? (
              <EmptyState message="Não foi possível carregar os treinos deste aluno." />
            ) : activeWorkoutPlan ? (
              <>
                <Link
                  href={`/workouts/${activeWorkoutPlan.id}`}
                  className="group flex items-start justify-between gap-4 rounded-md transition-colors hover:text-primary"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-display text-base font-semibold">
                      {activeWorkoutPlan.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatWorkoutPeriod(activeWorkoutPlan)}
                    </span>
                  </div>
                  <ChevronRight className="mt-0.5 size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </Link>
                <div className="flex flex-col gap-2">
                  <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Dias de treino
                  </span>
                  <div className="flex flex-col gap-2">
                    {trainingDays.map((day) => (
                      <div
                        key={day.key}
                        className="flex items-center gap-3 rounded-lg border border-primary/20 bg-success-bg px-3.5 py-2.5"
                      >
                        <span className="grid h-6 min-w-6 place-items-center rounded bg-primary px-2 font-display text-xs font-semibold text-primary-foreground">
                          {day.key}
                        </span>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {day.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {day.muscles}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/workouts/${activeWorkoutPlan.id}`}>
                    <Eye />
                    Ver treino completo
                  </Link>
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-[12px] border border-dashed border-border px-4 py-8 text-center">
                <Dumbbell className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Nenhum treino ativo para este aluno.
                </p>
                <Button asChild size="sm">
                  <Link href={`/workouts/new?studentId=${s.id}`} className="gap-2">
                    <Plus />
                    Novo treino
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden p-0">
          <CardHeader className="flex-row items-center justify-between border-b border-border px-5 py-4">
            <CardTitle>Última avaliação</CardTitle>
            {latestAssessment && (
              <span className="text-sm text-muted-foreground">
                {formatDate(latestAssessment.date)}
              </span>
            )}
          </CardHeader>
          <CardContent className="gap-4 px-5 py-5">
            {assessmentsLoadFailed ? (
              <EmptyState message="Não foi possível carregar as avaliações deste aluno." />
            ) : latestAssessment ? (
              <>
                <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Métricas principais
                </span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                  <MetricCard label="Peso" value={formatMetric(latestAssessment.weightKg, 'kg')} />
                  <MetricCard
                    label="Gordura"
                    value={formatMetric(latestAssessment.bodyFatPct, '% gordura')}
                  />
                  <MetricCard
                    label="Altura"
                    value={formatMetric(latestAssessment.heightCm, 'cm')}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Observações
                  </span>
                  <p className="rounded-lg bg-card-hover px-3.5 py-3 text-sm text-muted-foreground">
                    {latestAssessment.notes ?? 'Sem observações.'}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Medidas
                  </span>
                  {measurementRows.length > 0 ? (
                    <dl>
                      {measurementRows.map((row) => (
                        <div
                          key={row.key}
                          className="flex items-center justify-between border-b border-border py-2 last:border-b-0"
                        >
                          <dt className="text-sm text-muted-foreground">{row.label}</dt>
                          <dd className="font-display text-sm font-semibold text-foreground">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma medida registrada.</p>
                  )}
                </div>
                <WeightEvolutionChart points={weightChartPoints} />
                <div className="flex gap-2">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-primary hover:bg-success-bg hover:text-primary"
                  >
                    <Link href={`/students/${s.id}/assessments`}>Ver histórico</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/students/${s.id}/assessments/new`} className="gap-2">
                      <Plus />
                      Nova avaliação
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-[12px] border border-dashed border-border px-4 py-8 text-center">
                <ClipboardList className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada ainda.</p>
                <Button asChild size="sm">
                  <Link href={`/students/${s.id}/assessments/new`} className="gap-2">
                    <Plus />
                    Nova avaliação
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-sm leading-relaxed text-foreground">{value}</span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card-hover p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="mt-1 font-display text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[12px] border border-dashed border-border px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
