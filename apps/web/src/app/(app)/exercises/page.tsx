import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { TopBar } from '@/components/top-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { configureServerClient } from '@/lib/api-client';
import { getExercises } from '@/lib/api/sdk.gen';
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL, type MuscleGroup } from '@/lib/muscle-groups';
import { Dumbbell, Search, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { CreateExerciseDialog } from './_create-dialog';
import { deleteExerciseAction } from './actions';

interface SP {
  q?: string;
  group?: MuscleGroup;
  equipment?: string;
  scope?: 'mine' | 'global' | 'all';
}

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { q, group, equipment, scope = 'all' } = await searchParams;
  const client = await configureServerClient();
  const res = await getExercises({
    client,
    query: { q, muscleGroup: group, equipment, scope, limit: 100 },
  });
  const items = (res.data?.items ?? []) as Array<{
    id: string;
    name: string;
    muscleGroup: MuscleGroup;
    equipment: string | null;
    trainerId: string | null;
  }>;
  const equipmentOptions = Array.from(
    new Set(items.flatMap((exercise) => (exercise.equipment ? [exercise.equipment] : []))),
  ).sort((left, right) => left.localeCompare(right, 'pt-BR'));
  if (equipment && !equipmentOptions.includes(equipment)) equipmentOptions.unshift(equipment);

  return (
    <>
      <TopBar
        title="Biblioteca de exercícios"
        subtitle={`${res.data?.total ?? items.length} exercícios disponíveis`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <form action="/exercises" className="relative w-full sm:w-70">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                aria-label="Buscar exercícios"
                placeholder="Buscar exercícios..."
                className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-4 text-sm"
              />
              {group && <input type="hidden" name="group" value={group} />}
              {equipment && <input type="hidden" name="equipment" value={equipment} />}
              <input type="hidden" name="scope" value={scope} />
            </form>
            <CreateExerciseDialog />
          </div>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 font-display text-xs font-semibold text-foreground">
            Grupo muscular:
          </span>
          <GroupChip
            current={group}
            value={undefined}
            label="Todos"
            scope={scope}
            q={q}
            equipment={equipment}
          />
          {MUSCLE_GROUPS.map((muscleGroup) => (
            <GroupChip
              key={muscleGroup}
              current={group}
              value={muscleGroup}
              label={MUSCLE_GROUP_LABEL[muscleGroup]}
              scope={scope}
              q={q}
              equipment={equipment}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 font-display text-xs font-semibold text-foreground">Origem:</span>
          <ScopeChip
            current={scope}
            value="all"
            label="Todos"
            group={group}
            q={q}
            equipment={equipment}
          />
          <ScopeChip
            current={scope}
            value="global"
            label="Globais"
            group={group}
            q={q}
            equipment={equipment}
          />
          <ScopeChip
            current={scope}
            value="mine"
            label="Meus"
            group={group}
            q={q}
            equipment={equipment}
          />
        </div>
        <form action="/exercises" className="flex flex-wrap items-end gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          {group && <input type="hidden" name="group" value={group} />}
          <input type="hidden" name="scope" value={scope} />
          <label className="flex flex-col gap-1 font-display text-xs font-semibold text-foreground">
            Equipamento
            <select
              name="equipment"
              defaultValue={equipment ?? ''}
              className="h-9 min-w-48 rounded-md border border-input bg-card px-3 font-sans font-normal"
            >
              <option value="">Todos</option>
              {equipmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary" size="sm">
            Aplicar
          </Button>
        </form>
      </div>

      <section
        aria-label="Exercícios"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
      >
        {res.error ? (
          <p
            role="alert"
            className="col-span-full rounded-[12px] border border-destructive/20 bg-destructive-bg p-10 text-center text-sm text-destructive"
          >
            Não foi possível carregar os exercícios.
          </p>
        ) : items.length === 0 ? (
          <p className="col-span-full rounded-[12px] bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
            {q || group || equipment || scope !== 'all'
              ? 'Nenhum exercício corresponde aos filtros.'
              : 'Sua biblioteca de exercícios está vazia.'}
          </p>
        ) : (
          items.map((ex) => (
            <article
              key={ex.id}
              aria-label={ex.name}
              className="overflow-hidden rounded-[12px] bg-card shadow-card transition-shadow hover:shadow-elevated"
            >
              <div
                role="img"
                aria-label={`Ilustração de ${ex.name}`}
                className="grid h-36 place-items-center bg-muted text-muted-foreground"
              >
                <Dumbbell className="size-8" />
              </div>
              <div className="flex flex-col gap-3 p-4">
                <h3 className="min-h-10 font-display text-sm font-bold leading-snug">{ex.name}</h3>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="info" dot={false}>
                    {MUSCLE_GROUP_LABEL[ex.muscleGroup]}
                  </Badge>
                  {ex.equipment && (
                    <span className="rounded bg-muted px-2 py-1">{ex.equipment}</span>
                  )}
                </div>
                <div className="flex min-h-8 items-center justify-between border-t border-border pt-3">
                  <Star className="size-3.5 text-warning" aria-hidden="true" />
                  {ex.trainerId && (
                    <ConfirmationDialog
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Excluir ${ex.name}`}
                        >
                          <Trash2 />
                        </Button>
                      }
                      title="Excluir exercício?"
                      description={`Você está prestes a excluir ${ex.name}. Esta ação não pode ser desfeita.`}
                      confirmLabel="Excluir exercício"
                      pendingLabel="Excluindo..."
                      confirmAction={deleteExerciseAction}
                      hiddenFields={{ id: ex.id }}
                    />
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}

function ScopeChip({
  current,
  value,
  label,
  group,
  q,
  equipment,
}: {
  current: string;
  value: string;
  label: string;
  group?: MuscleGroup;
  q?: string;
  equipment?: string;
}) {
  const active = current === value;
  return (
    <Link
      href={{
        pathname: '/exercises',
        query: {
          ...(q ? { q } : {}),
          ...(group ? { group } : {}),
          ...(equipment ? { equipment } : {}),
          scope: value,
        },
      }}
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
  q,
  equipment,
}: {
  current?: string;
  value?: MuscleGroup;
  label: string;
  scope: string;
  q?: string;
  equipment?: string;
}) {
  const active = current === value || (!current && !value);
  return (
    <Link
      href={{
        pathname: '/exercises',
        query: {
          ...(q ? { q } : {}),
          ...(value ? { group: value } : {}),
          ...(equipment ? { equipment } : {}),
          scope,
        },
      }}
      className={`rounded-pill px-3 py-1 text-xs transition-colors ${
        active
          ? 'bg-success-bg text-success'
          : 'bg-card text-muted-foreground border border-border hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}
