'use client';

import type { ExerciseLite } from '@/application/workouts/workout-editor-model';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL, type MuscleGroup } from '@/lib/muscle-groups';
import { Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { type RefObject, useMemo, useRef, useState } from 'react';

interface ExerciseDrawerProps {
  open: boolean;
  exercises: ExerciseLite[];
  equipmentFacets: string[];
  exercisesError: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpenChange: (open: boolean) => void;
  onAddExercise: (exercise: ExerciseLite) => void;
}

export function ExerciseDrawer({
  open,
  exercises,
  equipmentFacets,
  exercisesError,
  triggerRef,
  onOpenChange,
  onAddExercise,
}: ExerciseDrawerProps) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | ''>('');
  const [equipment, setEquipment] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return exercises.filter(
      (exercise) =>
        (!normalized || exercise.name.toLocaleLowerCase('pt-BR').includes(normalized)) &&
        (!group || exercise.muscleGroup === group) &&
        (!equipment || exercise.equipment === equipment),
    );
  }, [equipment, exercises, group, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="exercise-drawer-description"
        showCloseButton={false}
        overlayClassName="bg-black/20 lg:hidden"
        className="inset-y-0 top-0 right-0 left-auto flex h-full w-full max-w-sm translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-l border-border bg-card p-0 shadow-elevated ring-0 lg:absolute lg:w-80 lg:max-w-none"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <DialogTitle className="font-display text-lg font-bold">
              Adicionar exercício
            </DialogTitle>
            <DialogDescription id="exercise-drawer-description" className="sr-only">
              Escolha um exercício da biblioteca para o dia ativo.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Fechar">
              <X aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <div className="space-y-4 border-b border-border p-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={searchRef}
              type="search"
              aria-label="Buscar exercícios"
              value={query}
              className="pl-9"
              placeholder="Buscar exercícios..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="drawer-group">Grupo muscular</Label>
              <select
                id="drawer-group"
                value={group}
                className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                onChange={(event) => setGroup(event.target.value as MuscleGroup | '')}
              >
                <option value="">Todos</option>
                {MUSCLE_GROUPS.map((item) => (
                  <option key={item} value={item}>
                    {MUSCLE_GROUP_LABEL[item]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="drawer-equipment">Equipamento</Label>
              <select
                id="drawer-equipment"
                value={equipment}
                className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                onChange={(event) => setEquipment(event.target.value)}
              >
                <option value="">Todos</option>
                {equipmentFacets.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {exercisesError ? (
            <p role="alert" className="rounded-md bg-destructive-bg p-3 text-sm text-destructive">
              Não foi possível carregar os exercícios.
            </p>
          ) : exercises.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              A biblioteca de exercícios está vazia.
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Nenhum exercício encontrado.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((exercise) => (
                <li
                  key={exercise.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold">{exercise.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {MUSCLE_GROUP_LABEL[exercise.muscleGroup]}
                      {exercise.equipment ? ` · ${exercise.equipment}` : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Adicionar ${exercise.name}`}
                    onClick={() => onAddExercise(exercise)}
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border p-4">
          <Button asChild variant="secondary" className="w-full">
            <Link href="/exercises">Criar exercício personalizado</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
