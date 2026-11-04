'use client';

import {
  type ExerciseLite,
  type WorkoutDraft,
  type WorkoutDraftValidationError,
  type WorkoutExerciseDraft,
  addWorkoutDay,
  addWorkoutExercise,
  createWorkoutDraft,
  discardWorkoutDraft,
  moveWorkoutExercise,
  removeWorkoutDay,
  removeWorkoutExercise,
  updateWorkoutDayLabel,
  updateWorkoutExercise,
  validateWorkoutDraft,
} from '@/application/workouts/workout-editor-model';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState, useTransition } from 'react';
import { ExerciseDrawer } from './_exercise-drawer';
import { WorkoutDayTabs } from './_workout-day-tabs';
import { WorkoutDetailsPanel } from './_workout-details-panel';
import { WorkoutEmptyState } from './_workout-empty-state';
import { WorkoutExerciseTable } from './_workout-exercise-table';
import { createWorkoutPlanAction } from './actions';

interface WorkoutBuilderProps {
  students: Array<{ id: string; name: string; email: string | null; avatarUrl: string | null }>;
  exercises: ExerciseLite[];
  equipmentFacets: string[];
  initialStudentId: string;
  studentsError: boolean;
  exercisesError: boolean;
}

function createId(): string {
  return globalThis.crypto.randomUUID();
}

export function WorkoutBuilder({
  students,
  exercises,
  equipmentFacets,
  initialStudentId,
  studentsError,
  exercisesError,
}: WorkoutBuilderProps) {
  const router = useRouter();
  const initialDayId = useId();
  const [draft, setDraft] = useState<WorkoutDraft>(() =>
    createWorkoutDraft(initialStudentId, () => initialDayId),
  );
  const [activeDay, setActiveDay] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<WorkoutDraftValidationError[]>([]);
  const [pending, startTransition] = useTransition();
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const active = draft.days[activeDay] ?? draft.days[0];

  function changeDraft<K extends keyof WorkoutDraft>(key: K, value: WorkoutDraft[K]): void {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addDay(): void {
    if (draft.days.length >= 7) return;
    setDraft((current) => ({ ...current, days: addWorkoutDay(current.days, createId) }));
    setActiveDay(draft.days.length);
  }

  function removeDay(index: number): void {
    setDraft((current) => ({ ...current, days: removeWorkoutDay(current.days, index) }));
    setActiveDay((current) =>
      Math.max(0, current > index ? current - 1 : current === index ? index - 1 : current),
    );
  }

  function addExercise(exercise: ExerciseLite): void {
    setDraft((current) => ({
      ...current,
      days: addWorkoutExercise(current.days, activeDay, exercise, createId),
    }));
    setDrawerOpen(false);
  }

  function updateExercise<K extends keyof WorkoutExerciseDraft>(
    exerciseIndex: number,
    key: K,
    value: WorkoutExerciseDraft[K],
  ): void {
    setDraft((current) => ({
      ...current,
      days: updateWorkoutExercise(current.days, activeDay, exerciseIndex, key, value),
    }));
  }

  function save(): void {
    setError(null);
    const validation = validateWorkoutDraft(draft);
    if (!validation.success) {
      setValidationErrors(validation.errors);
      setError(validation.errors[0]?.message ?? 'Revise os campos do treino.');
      return;
    }
    setValidationErrors([]);
    startTransition(async () => {
      try {
        const result = await createWorkoutPlanAction(validation.input);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/workouts/${result.workoutId}`);
      } catch {
        setError('Não foi possível salvar o treino. Tente novamente.');
      }
    });
  }

  return (
    <main
      aria-label="Construtor de treino"
      className="relative flex min-h-0 flex-1 overflow-hidden bg-background max-lg:flex-col"
    >
      <WorkoutDetailsPanel
        draft={draft}
        students={students}
        studentsError={studentsError}
        error={error}
        validationErrors={validationErrors}
        pending={pending}
        onChange={changeDraft}
        onDiscard={() => {
          setDraft((current) => discardWorkoutDraft(current, createId));
          setActiveDay(0);
          setError(null);
          setValidationErrors([]);
        }}
        onSave={save}
      />
      <section aria-label="Editor do treino" className="flex min-h-0 min-w-0 flex-1 flex-col">
        <WorkoutDayTabs
          days={draft.days}
          activeDay={activeDay}
          disabled={pending}
          validationErrors={validationErrors}
          onAddDay={addDay}
          onSelectDay={setActiveDay}
          onRenameDay={(index, label) =>
            setDraft((current) => ({
              ...current,
              days: updateWorkoutDayLabel(current.days, index, label),
            }))
          }
          onRemoveDay={removeDay}
        />
        {active && (
          <div
            id={`workout-day-panel-${active.id}`}
            role="tabpanel"
            aria-labelledby={`workout-day-tab-${active.id}`}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
              <h2 className="font-display text-lg font-bold">{active.label}</h2>
              <p className="text-sm text-muted-foreground">
                {active.exercises.length}{' '}
                {active.exercises.length === 1 ? 'exercício' : 'exercícios'}
              </p>
            </div>
            {active.exercises.length === 0 ? (
              <WorkoutEmptyState
                triggerRef={drawerTriggerRef}
                onAddExercise={() => setDrawerOpen(true)}
              />
            ) : (
              <WorkoutExerciseTable
                dayLabel={active.label}
                dayId={active.id}
                exercises={active.exercises}
                validationErrors={validationErrors}
                disabled={pending}
                triggerRef={drawerTriggerRef}
                onAddExercise={() => setDrawerOpen(true)}
                onMoveExercise={(exerciseIndex, direction) =>
                  setDraft((current) => ({
                    ...current,
                    days: moveWorkoutExercise(current.days, activeDay, exerciseIndex, direction),
                  }))
                }
                onRemoveExercise={(exerciseIndex) =>
                  setDraft((current) => ({
                    ...current,
                    days: removeWorkoutExercise(current.days, activeDay, exerciseIndex),
                  }))
                }
                onUpdateExercise={updateExercise}
              />
            )}
          </div>
        )}
      </section>
      <ExerciseDrawer
        open={drawerOpen}
        exercises={exercises}
        equipmentFacets={equipmentFacets}
        exercisesError={exercisesError}
        triggerRef={drawerTriggerRef}
        onOpenChange={setDrawerOpen}
        onAddExercise={addExercise}
      />
    </main>
  );
}
