import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { TopBar } from '@/components/top-bar';
import { Badge } from '@/components/ui/badge';
import { configureServerClient } from '@/lib/api-client';
import { getWorkoutPlansById } from '@/lib/api/sdk.gen';
import { MUSCLE_GROUP_LABEL, type MuscleGroup } from '@/lib/muscle-groups';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkoutDetailPage({ params }: Props) {
  const { id } = await params;
  const client = await configureServerClient();
  const res = await getWorkoutPlansById({ client, path: { id } });
  if (res.error || !res.data) notFound();
  const plan = res.data as {
    id: string;
    studentId: string;
    name: string;
    status: 'draft' | 'active' | 'archived';
    notes: string | null;
    days: Array<{
      id: string;
      label: string;
      exercises: Array<{
        id: string;
        sets: number;
        reps: string;
        restSeconds: number | null;
        loadKg: string | number | null;
        exercise: { id: string; name: string; muscleGroup: MuscleGroup };
      }>;
    }>;
  };

  return (
    <>
      <Link
        href={`/students/${plan.studentId}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Voltar para aluno
      </Link>
      <TopBar
        title={plan.name}
        subtitle={plan.notes ?? undefined}
        actions={
          <Badge variant={plan.status === 'active' ? 'active' : plan.status === 'draft' ? 'paused' : 'inactive'}>
            {plan.status === 'active' ? 'Ativo' : plan.status === 'draft' ? 'Rascunho' : 'Arquivado'}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plan.days.map((day) => (
          <article key={day.id} className="flex flex-col gap-3 rounded-[12px] bg-card p-5 shadow-card">
            <h3 className="font-display text-base font-bold">{day.label}</h3>
            <ul className="flex flex-col gap-2 text-sm">
              {day.exercises.map((ex) => (
                <li key={ex.id} className="flex flex-col gap-1 border-b border-border pb-2 last:border-b-0">
                  <span className="font-display font-semibold">{ex.exercise.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {MUSCLE_GROUP_LABEL[ex.exercise.muscleGroup]} · {ex.sets}x{ex.reps}
                    {ex.loadKg ? ` · ${ex.loadKg}kg` : ''}
                    {ex.restSeconds ? ` · ${ex.restSeconds}s desc.` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}
