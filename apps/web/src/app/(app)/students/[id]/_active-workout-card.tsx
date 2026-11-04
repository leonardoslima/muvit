import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, Dumbbell, Eye, Plus } from 'lucide-react';
import Link from 'next/link';

export type ActiveWorkoutPlan = {
  id: string;
  name: string;
  startDate: string | null;
  endDate?: string | null;
  status: 'active' | 'archived' | 'draft';
  days: Array<{ id: string; planId: string; label: string; dayOrder: number }>;
};

function formatDate(date: string): string {
  const dateOnly = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('pt-BR');
  }

  return new Date(date).toLocaleDateString('pt-BR');
}

function formatWorkoutPeriod(plan: ActiveWorkoutPlan): string {
  if (!plan.startDate) return 'Sem data de início';
  const start = formatDate(plan.startDate);
  return plan.endDate ? `${start} - ${formatDate(plan.endDate)}` : `Início em ${start}`;
}

function LoadError() {
  return (
    <div className="rounded-[12px] border border-dashed border-border px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">
        {'Não foi possível carregar os treinos deste aluno.'}
      </p>
    </div>
  );
}

export function ActiveWorkoutCard({
  studentId,
  activeWorkoutPlan,
  loadFailed,
}: {
  studentId: string;
  activeWorkoutPlan: ActiveWorkoutPlan | undefined;
  loadFailed: boolean;
}) {
  return (
    <Card id="treino-ativo" className="gap-0 overflow-hidden p-0">
      <CardHeader className="flex-row items-center justify-between border-b border-border px-5 py-4">
        <CardTitle>Treino ativo</CardTitle>
        <Badge variant={activeWorkoutPlan ? 'active' : 'paused'}>
          {activeWorkoutPlan ? 'Ativo' : 'Pendente'}
        </Badge>
      </CardHeader>
      <CardContent className="gap-4 px-5 py-5">
        {loadFailed ? (
          <LoadError />
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
              {activeWorkoutPlan.days.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {activeWorkoutPlan.days.map((day) => (
                    <div
                      key={day.id}
                      className="flex items-center gap-3 rounded-lg border border-primary/20 bg-success-bg px-3.5 py-2.5"
                    >
                      <span className="grid h-6 min-w-6 place-items-center rounded bg-primary px-2 font-display text-xs font-semibold text-primary-foreground">
                        {day.dayOrder + 1}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {day.label}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border px-3.5 py-4 text-sm text-muted-foreground">
                  Nenhum dia de treino configurado neste plano.
                </p>
              )}
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
            <p className="text-sm text-muted-foreground">Nenhum treino ativo para este aluno.</p>
            <Button asChild size="sm">
              <Link href={`/workouts/new?studentId=${studentId}`} className="gap-2">
                <Plus />
                Novo treino
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
