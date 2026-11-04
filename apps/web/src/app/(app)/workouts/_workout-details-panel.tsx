import type {
  WorkoutDraft,
  WorkoutDraftValidationError,
  WorkoutStatus,
} from '@/application/workouts/workout-editor-model';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface WorkoutStudent {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

interface WorkoutDetailsPanelProps {
  draft: WorkoutDraft;
  students: WorkoutStudent[];
  studentsError: boolean;
  error: string | null;
  validationErrors: WorkoutDraftValidationError[];
  pending: boolean;
  onChange: <K extends keyof WorkoutDraft>(key: K, value: WorkoutDraft[K]) => void;
  onDiscard: () => void;
  onSave: () => void;
}

export function WorkoutDetailsPanel({
  draft,
  students,
  studentsError,
  error,
  validationErrors,
  pending,
  onChange,
  onDiscard,
  onSave,
}: WorkoutDetailsPanelProps) {
  const savingDisabled = pending || studentsError || students.length === 0;
  const selectedStudent = students.find((student) => student.id === draft.studentId);
  const fieldError = (path: string) => validationErrors.find((item) => item.path === path)?.message;
  const studentError = fieldError('studentId');
  const nameError = fieldError('name');
  const startDateError = fieldError('startDate');
  const endDateError = fieldError('endDate');
  const notesError = fieldError('notes');

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-b border-border bg-card lg:w-90 lg:border-r lg:border-b-0">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 lg:p-6">
        <div>
          <h1 className="font-display text-xl font-bold">Detalhes do treino</h1>
          <p className="mt-1 text-sm text-muted-foreground">Defina os dados gerais deste plano.</p>
        </div>

        {studentsError && (
          <p
            role="alert"
            className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive"
          >
            Não foi possível carregar os alunos.
          </p>
        )}

        {students.length === 0 && !studentsError && (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p>Cadastre um aluno ativo para criar um treino.</p>
            <Link
              href="/students/new"
              className="mt-2 inline-flex font-semibold text-primary hover:underline"
            >
              Cadastrar aluno
            </Link>
          </div>
        )}

        <Field label="Aluno" htmlFor="workout-student">
          {selectedStudent && (
            <div className="flex items-center gap-3 rounded-md bg-muted/40 p-3">
              <Avatar name={selectedStudent.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold">
                  {selectedStudent.name}
                </p>
                {selectedStudent.email && (
                  <p className="truncate text-xs text-muted-foreground">{selectedStudent.email}</p>
                )}
              </div>
            </div>
          )}
          <select
            id="workout-student"
            value={draft.studentId}
            aria-invalid={Boolean(studentError)}
            aria-describedby={studentError ? 'workout-student-error' : undefined}
            disabled={studentsError || students.length === 0 || pending}
            className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
            onChange={(event) => onChange('studentId', event.target.value)}
          >
            {students.length === 0 && <option value="">Nenhum aluno disponível</option>}
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.email ? `${student.name} — ${student.email}` : student.name}
              </option>
            ))}
          </select>
          <FieldError id="workout-student-error" message={studentError} />
        </Field>

        <Field label="Nome do plano" htmlFor="workout-name">
          <Input
            id="workout-name"
            value={draft.name}
            maxLength={200}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'workout-name-error' : undefined}
            disabled={pending}
            placeholder="Ex.: Hipertrofia 4x por semana"
            onChange={(event) => onChange('name', event.target.value)}
          />
          <FieldError id="workout-name-error" message={nameError} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Field label="Data inicial" htmlFor="workout-start-date">
            <Input
              id="workout-start-date"
              type="date"
              value={draft.startDate}
              aria-invalid={Boolean(startDateError)}
              aria-describedby={startDateError ? 'workout-start-date-error' : undefined}
              disabled={pending}
              onChange={(event) => onChange('startDate', event.target.value)}
            />
            <FieldError id="workout-start-date-error" message={startDateError} />
          </Field>
          <Field label="Data final" htmlFor="workout-end-date">
            <Input
              id="workout-end-date"
              type="date"
              value={draft.endDate}
              aria-invalid={Boolean(endDateError)}
              aria-describedby={endDateError ? 'workout-end-date-error' : undefined}
              disabled={pending}
              onChange={(event) => onChange('endDate', event.target.value)}
            />
            <FieldError id="workout-end-date-error" message={endDateError} />
          </Field>
        </div>

        <Field label="Status" htmlFor="workout-status">
          <select
            id="workout-status"
            value={draft.status}
            disabled={pending}
            className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
            onChange={(event) => onChange('status', event.target.value as WorkoutStatus)}
          >
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
            <option value="archived">Arquivado</option>
          </select>
        </Field>

        <Field label="Notas gerais" htmlFor="workout-notes">
          <textarea
            id="workout-notes"
            value={draft.notes}
            maxLength={2000}
            aria-invalid={Boolean(notesError)}
            aria-describedby={notesError ? 'workout-notes-error' : undefined}
            disabled={pending}
            rows={4}
            className="w-full resize-none rounded-md border border-input bg-card px-4 py-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
            onChange={(event) => onChange('notes', event.target.value)}
          />
          <FieldError id="workout-notes-error" message={notesError} />
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-3 border-t border-border p-4 lg:p-5">
        <ConfirmationDialog
          trigger={
            <Button type="button" variant="secondary" className="flex-1" disabled={pending}>
              Descartar
            </Button>
          }
          title="Descartar alterações?"
          description="Os dados deste rascunho serão apagados. O aluno selecionado será preservado."
          confirmLabel="Descartar"
          pendingLabel="Descartando..."
          confirmAction={onDiscard}
        />
        <Button type="button" className="flex-1" disabled={savingDisabled} onClick={onSave}>
          {pending ? 'Salvando…' : 'Salvar treino'}
        </Button>
      </div>
    </aside>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
