import { TopBar } from '@/components/top-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { configureServerClient } from '@/lib/api-client';
import { getExercises } from '@/lib/api/sdk.gen';
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL, type MuscleGroup } from '@/lib/muscle-groups';
import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { CreateExerciseDialog } from './_create-dialog';
import { deleteExerciseAction } from './actions';

interface SP {
  group?: MuscleGroup;
  scope?: 'mine' | 'global' | 'all';
}

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { group, scope = 'all' } = await searchParams;
  const client = await configureServerClient();
  const res = await getExercises({
    client,
    query: { muscleGroup: group, scope, limit: 100 },
  });
  const items = (res.data?.items ?? []) as Array<{
    id: string;
    name: string;
    muscleGroup: MuscleGroup;
    equipment: string | null;
    trainerId: string | null;
  }>;

  return (
    <>
      <TopBar
        title="Biblioteca de exercícios"
        subtitle="Use os globais ou crie os seus."
        actions={<CreateExerciseDialog />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <ScopeChip current={scope} value="all" label="Todos" />
        <ScopeChip current={scope} value="global" label="Globais" />
        <ScopeChip current={scope} value="mine" label="Meus" />
        <span className="mx-2 h-5 w-px bg-border" />
        <GroupChip current={group} value={undefined} label="Todos os grupos" scope={scope} />
        {MUSCLE_GROUPS.map((g) => (
          <GroupChip
            key={g}
            current={group}
            value={g}
            label={MUSCLE_GROUP_LABEL[g]}
            scope={scope}
          />
        ))}
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 ? (
          <p className="col-span-full rounded-[12px] bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
            Nenhum exercício para este filtro.
          </p>
        ) : (
          items.map((ex) => (
            <article
              key={ex.id}
              className="flex flex-col gap-3 rounded-[12px] bg-card p-5 shadow-card transition-shadow hover:shadow-elevated"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-base font-bold leading-tight">{ex.name}</h3>
                {ex.trainerId === null ? (
                  <Badge variant="info" dot={false}>
                    Global
                  </Badge>
                ) : (
                  <Badge variant="active" dot={false}>
                    Meu
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-pill bg-muted px-2.5 py-1 font-display font-semibold uppercase tracking-[0.05em] text-foreground">
                  {MUSCLE_GROUP_LABEL[ex.muscleGroup]}
                </span>
                {ex.equipment && <span>· {ex.equipment}</span>}
              </div>
              {ex.trainerId && (
                <div className="flex items-center justify-end pt-2">
                  <form action={deleteExerciseAction}>
                    <input type="hidden" name="id" value={ex.id} />
                    <Button type="submit" variant="ghost" size="icon-sm" aria-label="Excluir">
                      <Trash2 />
                    </Button>
                  </form>
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </>
  );
}

function ScopeChip({ current, value, label }: { current: string; value: string; label: string }) {
  const active = current === value;
  return (
    <Link
      href={{ pathname: '/exercises', query: { scope: value } }}
      className={`rounded-pill px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.05em] transition-colors ${
        active
          ? 'bg-foreground text-background'
          : 'bg-muted text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}

function GroupChip({
  current,
  value,
  label,
  scope,
}: {
  current?: string;
  value?: MuscleGroup;
  label: string;
  scope: string;
}) {
  const active = current === value || (!current && !value);
  return (
    <Link
      href={{
        pathname: '/exercises',
        query: { ...(value ? { group: value } : {}), scope },
      }}
      className={`rounded-pill px-3 py-1 text-xs transition-colors ${
        active
          ? 'bg-success-bg text-[#1B7A3D]'
          : 'bg-card text-muted-foreground border border-border hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}
