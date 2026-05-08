'use client';

import { useMemo, useState, useTransition } from 'react';
import { ChevronDown, ChevronUp, Plus, Search, Trash2, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MUSCLE_GROUP_LABEL, type MuscleGroup } from '@/lib/muscle-groups';
import { createWorkoutPlanAction } from './actions';

type ExerciseLite = { id: string; name: string; muscleGroup: MuscleGroup };

type DayState = {
  label: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    muscleGroup: MuscleGroup;
    sets: number;
    reps: string;
    restSeconds?: number;
    loadKg?: number;
    notes?: string;
  }>;
};

const DEFAULT_LABELS = ['Treino A', 'Treino B', 'Treino C', 'Treino D', 'Treino E', 'Treino F', 'Treino G'];

export function WorkoutEditor({
  studentId,
  exercises,
}: {
  studentId: string;
  exercises: ExerciseLite[];
}) {
  const [planName, setPlanName] = useState('');
  const [notes, setNotes] = useState('');
  const [days, setDays] = useState<DayState[]>([
    { label: 'Treino A', exercises: [] },
  ]);
  const [activeDay, setActiveDay] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addDay() {
    if (days.length >= 7) return;
    setDays((d) => [...d, { label: DEFAULT_LABELS[d.length] ?? `Treino ${d.length + 1}`, exercises: [] }]);
    setActiveDay(days.length);
  }
  function removeDay(idx: number) {
    if (days.length === 1) return;
    setDays((d) => d.filter((_, i) => i !== idx));
    setActiveDay(0);
  }
  function updateDayLabel(idx: number, label: string) {
    setDays((d) => d.map((day, i) => (i === idx ? { ...day, label } : day)));
  }
  function addExercise(ex: ExerciseLite) {
    setDays((d) =>
      d.map((day, i) =>
        i === activeDay
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                { exerciseId: ex.id, exerciseName: ex.name, muscleGroup: ex.muscleGroup, sets: 3, reps: '10' },
              ],
            }
          : day,
      ),
    );
    setPickerOpen(false);
  }
  function removeExercise(dayIdx: number, exIdx: number) {
    setDays((d) =>
      d.map((day, i) =>
        i === dayIdx ? { ...day, exercises: day.exercises.filter((_, j) => j !== exIdx) } : day,
      ),
    );
  }
  function moveExercise(dayIdx: number, exIdx: number, dir: -1 | 1) {
    setDays((d) =>
      d.map((day, i) => {
        if (i !== dayIdx) return day;
        const next = [...day.exercises];
        const t = exIdx + dir;
        if (t < 0 || t >= next.length) return day;
        const tmp = next[exIdx]!;
        next[exIdx] = next[t]!;
        next[t] = tmp;
        return { ...day, exercises: next };
      }),
    );
  }
  function updateEx<K extends keyof DayState['exercises'][number]>(
    dayIdx: number,
    exIdx: number,
    key: K,
    value: DayState['exercises'][number][K],
  ) {
    setDays((d) =>
      d.map((day, i) =>
        i === dayIdx
          ? {
              ...day,
              exercises: day.exercises.map((e, j) => (j === exIdx ? { ...e, [key]: value } : e)),
            }
          : day,
      ),
    );
  }

  function save(status: 'draft' | 'active') {
    setError(null);
    if (!planName.trim()) return setError('Informe um nome para o treino.');
    if (days.some((d) => d.exercises.length === 0)) {
      return setError('Cada dia precisa ter ao menos 1 exercício.');
    }
    startTransition(async () => {
      const res = await createWorkoutPlanAction({
        studentId,
        name: planName.trim(),
        notes: notes.trim() || undefined,
        status,
        days: days.map((day, i) => ({
          label: day.label,
          dayOrder: i,
          exercises: day.exercises.map((ex, j) => ({
            exerciseId: ex.exerciseId,
            exerciseOrder: j,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
            loadKg: ex.loadKg,
            notes: ex.notes,
          })),
        })),
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      {/* Left panel — plan metadata + days */}
      <aside className="flex flex-col gap-4 self-start rounded-[12px] bg-card p-6 shadow-card">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="planName">Nome do treino</Label>
          <Input
            id="planName"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="Ex: Hipertrofia 4x/semana"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notas</Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm resize-none"
          />
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Dias ({days.length})
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={addDay} disabled={days.length >= 7}>
              <Plus className="size-4" /> Adicionar
            </Button>
          </div>
          <ul className="flex flex-col gap-1">
            {days.map((d, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                  activeDay === i ? 'bg-success-bg' : 'hover:bg-muted'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveDay(i)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span
                    className={`grid size-6 place-items-center rounded-pill text-xs font-display font-bold ${
                      activeDay === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    value={d.label}
                    onChange={(e) => updateDayLabel(i, e.target.value)}
                    className="bg-transparent font-display text-sm font-semibold outline-none"
                  />
                  <span className="ml-auto text-xs text-muted-foreground">{d.exercises.length}</span>
                </button>
                {days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDay(i)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remover dia"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="mt-2 flex flex-col gap-2">
          <Button onClick={() => save('active')} disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar treino'}
          </Button>
          <Button variant="secondary" onClick={() => save('draft')} disabled={pending}>
            Salvar como rascunho
          </Button>
        </div>
      </aside>

      {/* Center — current day exercises */}
      <section className="rounded-[12px] bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{days[activeDay]?.label}</h2>
          <PickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            exercises={exercises}
            onPick={addExercise}
          />
        </div>

        {days[activeDay]?.exercises.length === 0 ? (
          <div className="grid place-items-center rounded-md border border-dashed border-border px-5 py-12 text-center">
            <Search className="mb-3 size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum exercício neste dia. Use “+ Exercício” para adicionar.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {days[activeDay]!.exercises.map((ex, j) => (
              <li
                key={`${ex.exerciseId}-${j}`}
                className="flex flex-col gap-3 rounded-md border border-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-display font-semibold">{ex.exerciseName}</span>
                    <Badge variant="info" dot={false} className="mt-1 self-start">
                      {MUSCLE_GROUP_LABEL[ex.muscleGroup]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                      onClick={() => moveExercise(activeDay, j, -1)}
                      disabled={j === 0}
                      aria-label="Mover para cima"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                      onClick={() => moveExercise(activeDay, j, 1)}
                      disabled={j === days[activeDay]!.exercises.length - 1}
                      aria-label="Mover para baixo"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive-bg hover:text-destructive"
                      onClick={() => removeExercise(activeDay, j)}
                      aria-label="Remover"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <NumberField
                    label="Séries"
                    value={ex.sets}
                    onChange={(v) => updateEx(activeDay, j, 'sets', v)}
                    min={1}
                    max={20}
                  />
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`reps-${j}`}>Reps</Label>
                    <Input
                      id={`reps-${j}`}
                      value={ex.reps}
                      onChange={(e) => updateEx(activeDay, j, 'reps', e.target.value)}
                      placeholder="10 ou 8-12"
                    />
                  </div>
                  <NumberField
                    label="Carga (kg)"
                    value={ex.loadKg ?? 0}
                    onChange={(v) => updateEx(activeDay, j, 'loadKg', v || undefined)}
                    min={0}
                    step={2.5}
                  />
                  <NumberField
                    label="Descanso (s)"
                    value={ex.restSeconds ?? 60}
                    onChange={(v) => updateEx(activeDay, j, 'restSeconds', v || undefined)}
                    min={0}
                    step={15}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

function PickerDialog({
  open,
  onOpenChange,
  exercises,
  onPick,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  exercises: ExerciseLite[];
  onPick: (ex: ExerciseLite) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(needle));
  }, [q, exercises]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <Button className="gap-2">
          <Plus />
          Exercício
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-[12px] bg-card p-6 shadow-elevated focus-visible:outline-none">
          <div className="flex items-start justify-between">
            <Dialog.Title className="font-display text-lg font-bold">Adicionar exercício</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar exercício…" className="pl-9" />
          </div>
          <ul className="mt-4 flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
            {filtered.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => onPick(ex)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <span className="font-display text-sm font-semibold">{ex.name}</span>
                  <span className="text-xs text-muted-foreground">{MUSCLE_GROUP_LABEL[ex.muscleGroup]}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nenhum exercício encontrado.
              </li>
            )}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
