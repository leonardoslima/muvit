import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { StudentForm } from '@/components/student-form';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { configureServerClient } from '@/lib/api-client';
import {
  getStudentsById,
  getStudentsByStudentIdAssessments,
  getStudentsByStudentIdWorkoutPlans,
} from '@/lib/api/sdk.gen';
import { ChevronLeft, ClipboardList, Dumbbell, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deleteStudentAction, updateStudentAction } from './actions';

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
  bodyFatPct: string | number | null;
  notes: string | null;
};

type WorkoutPlan = {
  id: string;
  name: string;
  startDate: string | null;
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

export default async function StudentDetailPage({ params }: Props) {
  const { id } = await params;
  const client = await configureServerClient();
  const [res, assessmentsRes, workoutPlansRes] = await Promise.all([
    getStudentsById({ client, path: { id } }),
    getStudentsByStudentIdAssessments({
      client,
      path: { studentId: id },
      query: { limit: 3 },
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

  return (
    <>
      <Link
        href="/students"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>

      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={s.name} size="lg" />
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[28px] font-bold leading-tight">{s.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {s.email && <span>{s.email}</span>}
              <Badge
                variant={
                  s.status === 'active' ? 'active' : s.status === 'paused' ? 'paused' : 'inactive'
                }
              >
                {s.status === 'active' ? 'Ativo' : s.status === 'paused' ? 'Pausado' : 'Inativo'}
              </Badge>
              <span className="text-xs uppercase tracking-[0.08em]">
                {s.isIndependent ? 'Independente' : 'Personal'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href={`/workouts/new?studentId=${s.id}`}>+ Treino</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/students/${s.id}/assessments/new`}>+ Avaliação</Link>
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-[12px] bg-card p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold">Avaliações</h2>
              <p className="text-sm text-muted-foreground">
                Últimos registros físicos deste aluno.
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/students/${s.id}/assessments`} className="gap-2">
                Ver todas
              </Link>
            </Button>
          </div>
          {assessmentsLoadFailed ? (
            <div className="rounded-[12px] border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar as avaliações deste aluno.
              </p>
            </div>
          ) : assessments.length === 0 ? (
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
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {assessments.map((assessment) => {
                const weight = toNum(assessment.weightKg);
                const bodyFat = toNum(assessment.bodyFatPct);

                return (
                  <li key={assessment.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-sm font-semibold">
                        {formatDate(assessment.date)}
                      </span>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {weight !== null && <span>{weight} kg</span>}
                        {bodyFat !== null && <span>{bodyFat}% gordura</span>}
                      </div>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {assessment.notes ?? 'Sem observações.'}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-[12px] bg-card p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold">Treinos ativos</h2>
              <p className="text-sm text-muted-foreground">
                Planos liberados para execução pelo aluno.
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/workouts/new?studentId=${s.id}`} className="gap-2">
                <Plus />
                Novo treino
              </Link>
            </Button>
          </div>
          {workoutPlansLoadFailed ? (
            <div className="rounded-[12px] border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar os treinos deste aluno.
              </p>
            </div>
          ) : activeWorkoutPlans.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[12px] border border-dashed border-border px-4 py-8 text-center">
              <Dumbbell className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum treino ativo para este aluno.</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {activeWorkoutPlans.map((plan) => (
                <li key={plan.id} className="py-4 first:pt-0 last:pb-0">
                  <Link
                    href={`/workouts/${plan.id}`}
                    className="flex items-center justify-between gap-4 rounded-md py-1 transition-colors hover:text-primary"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="truncate font-display text-sm font-semibold">
                        {plan.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {plan.startDate
                          ? `Início em ${formatDate(plan.startDate)}`
                          : 'Sem data de início'}
                      </span>
                    </div>
                    <Badge variant="active">Ativo</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-[12px] bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-bold">Dados do aluno</h2>
        <StudentForm action={updateStudentAction} initial={s} submitLabel="Salvar alterações" />
      </section>
    </>
  );
}
