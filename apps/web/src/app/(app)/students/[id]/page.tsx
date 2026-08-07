import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { configureServerClient } from '@/lib/api-client';
import {
  getStudentsById,
  getStudentsByStudentIdAssessments,
  getStudentsByStudentIdWorkoutPlans,
} from '@/lib/api/sdk.gen';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActiveWorkoutCard } from './_active-workout-card';
import { LatestAssessmentCard } from './_latest-assessment-card';
import { PersonalInfoCard } from './_personal-info-card';
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
  trainingDays: number | null;
  restrictions: string | null;
  internalNotes?: string | null;
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
  days: Array<{ id: string; planId: string; label: string; dayOrder: number }>;
};

function toNum(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function formatStudentStatus(status: Student['status']): string {
  if (status === 'active') return 'Ativo';
  if (status === 'paused') return 'Pausado';
  return 'Inativo';
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
        className="overflow-x-auto border-b border-border text-sm font-medium"
      >
        <div className="flex min-w-max">
          <a
            href={`/students/${s.id}`}
            aria-current="page"
            className="border-b-2 border-primary px-5 py-3 text-primary"
          >
            Visão geral
          </a>
          <a href="#treino-ativo" className="px-5 py-3 text-muted-foreground hover:text-foreground">
            Treinos
          </a>
          <a
            href="#ultima-avaliacao"
            className="px-5 py-3 text-muted-foreground hover:text-foreground"
          >
            Avaliações
          </a>
          <a
            href={`/students/${s.id}/assessments`}
            className="px-5 py-3 text-muted-foreground hover:text-foreground"
          >
            Histórico
          </a>
        </div>
      </nav>

      <div
        id="overview"
        data-testid="student-overview"
        className="grid grid-cols-1 gap-5 xl:grid-cols-3"
      >
        <PersonalInfoCard student={s} />
        <ActiveWorkoutCard
          studentId={s.id}
          activeWorkoutPlan={activeWorkoutPlan}
          loadFailed={workoutPlansLoadFailed}
        />
        <LatestAssessmentCard
          studentId={s.id}
          latestAssessment={latestAssessment}
          weightChartPoints={weightChartPoints}
          loadFailed={assessmentsLoadFailed}
        />
      </div>
    </>
  );
}
