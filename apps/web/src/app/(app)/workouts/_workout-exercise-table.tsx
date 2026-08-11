import type {
  WorkoutDraftValidationError,
  WorkoutExerciseDraft,
} from '@/application/workouts/workout-editor-model';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MUSCLE_GROUP_LABEL } from '@/lib/muscle-groups';
import { GripVertical, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { type RefObject, useState } from 'react';

interface WorkoutExerciseTableProps {
  dayLabel: string;
  dayId: string;
  exercises: WorkoutExerciseDraft[];
  validationErrors: WorkoutDraftValidationError[];
  disabled: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onAddExercise: () => void;
  onMoveExercise: (exerciseIndex: number, direction: -1 | 1) => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  onUpdateExercise: <K extends keyof WorkoutExerciseDraft>(
    exerciseIndex: number,
    key: K,
    value: WorkoutExerciseDraft[K],
  ) => void;
}

export function WorkoutExerciseTable({
  dayLabel,
  dayId,
  exercises,
  validationErrors,
  disabled,
  triggerRef,
  onAddExercise,
  onMoveExercise,
  onRemoveExercise,
  onUpdateExercise,
}: WorkoutExerciseTableProps) {
  const [notesOpen, setNotesOpen] = useState<Set<string>>(() => new Set());

  function toggleNotes(instanceId: string) {
    setNotesOpen((current) => {
      const next = new Set(current);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
      <table
        aria-label={`Exercícios de ${dayLabel}`}
        className="w-full min-w-240 border-separate border-spacing-0 overflow-hidden rounded-lg border border-border bg-card"
      >
        <thead>
          <tr className="text-left font-display text-xs uppercase tracking-wide text-muted-foreground">
            <th className="w-12 border-b border-border px-3 py-3">
              <span className="sr-only">Ordem</span>
            </th>
            <th className="min-w-52 border-b border-border px-3 py-3">Exercício</th>
            <th className="w-24 border-b border-border px-3 py-3">Séries</th>
            <th className="w-28 border-b border-border px-3 py-3">Repetições</th>
            <th className="w-28 border-b border-border px-3 py-3">Carga</th>
            <th className="w-28 border-b border-border px-3 py-3">Descanso</th>
            <th className="w-28 border-b border-border px-3 py-3">Tempo</th>
            <th className="w-24 border-b border-border px-3 py-3">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {exercises.map((exercise, index) => (
            <ExerciseRows
              key={exercise.id}
              dayId={dayId}
              exercise={exercise}
              index={index}
              disabled={disabled}
              notesOpen={notesOpen.has(exercise.id)}
              validationErrors={validationErrors}
              onToggleNotes={() => toggleNotes(exercise.id)}
              onMoveExercise={onMoveExercise}
              onRemoveExercise={onRemoveExercise}
              onUpdateExercise={onUpdateExercise}
            />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={8} className="p-3">
              <Button
                ref={triggerRef}
                type="button"
                variant="ghost"
                className="w-full border border-dashed border-border"
                onClick={onAddExercise}
                disabled={disabled}
              >
                <Plus aria-hidden="true" />
                Adicionar exercício
              </Button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ExerciseRows({
  exercise,
  dayId,
  index,
  disabled,
  notesOpen,
  validationErrors,
  onToggleNotes,
  onMoveExercise,
  onRemoveExercise,
  onUpdateExercise,
}: {
  exercise: WorkoutExerciseDraft;
  dayId: string;
  index: number;
  disabled: boolean;
  notesOpen: boolean;
  validationErrors: WorkoutDraftValidationError[];
  onToggleNotes: () => void;
  onMoveExercise: (exerciseIndex: number, direction: -1 | 1) => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  onUpdateExercise: <K extends keyof WorkoutExerciseDraft>(
    exerciseIndex: number,
    key: K,
    value: WorkoutExerciseDraft[K],
  ) => void;
}) {
  const path = (field: keyof WorkoutExerciseDraft) =>
    `days.${dayId}.exercises.${exercise.id}.${field}`;
  const fieldError = (field: keyof WorkoutExerciseDraft) =>
    validationErrors.find((item) => item.path === path(field))?.message;
  const setsError = fieldError('sets');
  const repsError = fieldError('reps');
  const loadError = fieldError('loadKg');
  const restError = fieldError('restSeconds');
  const tempoError = fieldError('tempo');
  const notesError = fieldError('notes');

  return (
    <>
      <tr className="align-middle">
        <td className="border-b border-border px-3 py-3">
          <button
            type="button"
            aria-label={`Reordenar ${exercise.exerciseName}`}
            className="rounded p-1 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            disabled={disabled}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
              event.preventDefault();
              onMoveExercise(index, event.key === 'ArrowUp' ? -1 : 1);
            }}
          >
            <GripVertical aria-hidden="true" />
          </button>
        </td>
        <td className="border-b border-border px-3 py-3">
          <p className="font-display text-sm font-semibold">{exercise.exerciseName}</p>
          <p className="text-xs text-muted-foreground">
            {MUSCLE_GROUP_LABEL[exercise.muscleGroup]}
            {exercise.equipment ? ` · ${exercise.equipment}` : ''}
          </p>
        </td>
        <NumberCell
          label={`Séries de ${exercise.exerciseName}`}
          value={exercise.sets}
          min={1}
          max={20}
          step={1}
          disabled={disabled}
          error={setsError}
          inputId={`exercise-${exercise.id}-sets`}
          onChange={(value) => onUpdateExercise(index, 'sets', value ?? 1)}
        />
        <td className="border-b border-border px-2 py-3">
          <Input
            aria-label={`Repetições de ${exercise.exerciseName}`}
            value={exercise.reps}
            maxLength={20}
            aria-invalid={Boolean(repsError)}
            aria-describedby={repsError ? `exercise-${exercise.id}-reps-error` : undefined}
            disabled={disabled}
            className="h-9 px-2"
            onChange={(event) => onUpdateExercise(index, 'reps', event.target.value)}
          />
          <FieldError id={`exercise-${exercise.id}-reps-error`} message={repsError} />
        </td>
        <NumberCell
          label={`Carga de ${exercise.exerciseName}`}
          value={exercise.loadKg}
          min={0}
          max={1000}
          step="any"
          disabled={disabled}
          error={loadError}
          inputId={`exercise-${exercise.id}-load`}
          onChange={(value) => onUpdateExercise(index, 'loadKg', value)}
        />
        <NumberCell
          label={`Descanso de ${exercise.exerciseName}`}
          value={exercise.restSeconds}
          min={0}
          max={600}
          step={1}
          disabled={disabled}
          error={restError}
          inputId={`exercise-${exercise.id}-rest`}
          onChange={(value) => onUpdateExercise(index, 'restSeconds', value)}
        />
        <td className="border-b border-border px-2 py-3">
          <Input
            aria-label={`Tempo de ${exercise.exerciseName}`}
            value={exercise.tempo ?? ''}
            maxLength={10}
            aria-invalid={Boolean(tempoError)}
            aria-describedby={tempoError ? `exercise-${exercise.id}-tempo-error` : undefined}
            disabled={disabled}
            className="h-9 px-2"
            placeholder="3-1-1"
            onChange={(event) => onUpdateExercise(index, 'tempo', event.target.value || undefined)}
          />
          <FieldError id={`exercise-${exercise.id}-tempo-error`} message={tempoError} />
        </td>
        <td className="border-b border-border px-2 py-3">
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Editar notas de ${exercise.exerciseName}`}
              disabled={disabled}
              onClick={onToggleNotes}
            >
              <MessageSquare aria-hidden="true" />
            </Button>
            <ConfirmationDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover ${exercise.exerciseName}`}
                  disabled={disabled}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              }
              title="Remover exercício?"
              description={`O exercício ${exercise.exerciseName} será removido deste treino.`}
              confirmLabel="Remover exercício"
              pendingLabel="Removendo..."
              confirmAction={() => onRemoveExercise(index)}
            />
          </div>
        </td>
      </tr>
      {notesOpen && (
        <tr>
          <td colSpan={8} className="border-b border-border bg-muted/30 px-4 py-3">
            <Label htmlFor={`exercise-notes-${exercise.id}`}>
              Notas de {exercise.exerciseName}
            </Label>
            <textarea
              id={`exercise-notes-${exercise.id}`}
              value={exercise.notes ?? ''}
              maxLength={500}
              aria-invalid={Boolean(notesError)}
              aria-describedby={notesError ? `exercise-${exercise.id}-notes-error` : undefined}
              disabled={disabled}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              onChange={(event) =>
                onUpdateExercise(index, 'notes', event.target.value || undefined)
              }
            />
            <FieldError id={`exercise-${exercise.id}-notes-error`} message={notesError} />
          </td>
        </tr>
      )}
    </>
  );
}

function NumberCell({
  label,
  value,
  min,
  max,
  step,
  disabled,
  error,
  inputId,
  onChange,
}: {
  label: string;
  value?: number;
  min: number;
  max: number;
  step: number | 'any';
  disabled: boolean;
  error?: string;
  inputId: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <td className="border-b border-border px-2 py-3">
      <Input
        type="number"
        aria-label={label}
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        disabled={disabled}
        className="h-9 px-2"
        onChange={(event) =>
          onChange(event.target.value === '' ? undefined : Number(event.target.value))
        }
      />
      <FieldError id={`${inputId}-error`} message={error} />
    </td>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}
