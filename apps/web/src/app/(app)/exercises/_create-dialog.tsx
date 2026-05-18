'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL } from '@/lib/muscle-groups';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, X } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { type CreateExerciseState, createExerciseAction } from './actions';

export function CreateExerciseDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CreateExerciseState, FormData>(
    createExerciseAction,
    null,
  );

  useEffect(() => {
    if (state === null && !pending && open) {
      // success returns null state — but we also start with null, so guard with form ref reset
    }
  }, [state, pending, open]);

  // Close on success: state becomes null and not pending — but we use a side flag
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (submitted && !pending && !state?.error && !state?.fieldErrors) {
      setOpen(false);
      setSubmitted(false);
    }
  }, [submitted, pending, state]);

  const fe = state?.fieldErrors ?? {};

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button className="gap-2">
          <Plus />
          Novo exercício
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-card p-6 shadow-elevated focus-visible:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="font-display text-lg font-bold">Novo exercício</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Crie um exercício custom para sua biblioteca.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <form
            action={(fd) => {
              setSubmitted(true);
              formAction(fd);
            }}
            className="mt-6 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" data-error={!!fe.name}>
                Nome
              </Label>
              <Input id="name" name="name" required aria-invalid={!!fe.name} />
              {fe.name && <p className="text-xs text-destructive">{fe.name}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="muscleGroup" data-error={!!fe.muscleGroup}>
                Grupo muscular
              </Label>
              <select
                id="muscleGroup"
                name="muscleGroup"
                required
                className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione
                </option>
                {MUSCLE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {MUSCLE_GROUP_LABEL[g]}
                  </option>
                ))}
              </select>
              {fe.muscleGroup && <p className="text-xs text-destructive">{fe.muscleGroup}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="equipment">Equipamento (opcional)</Label>
              <Input id="equipment" name="equipment" placeholder="Halter, barra, máquina…" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instructions">Instruções (opcional)</Label>
              <textarea
                id="instructions"
                name="instructions"
                rows={3}
                className="rounded-md border border-input bg-card px-3 py-2 text-sm resize-none"
              />
            </div>
            {state?.error && (
              <p className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={pending}>
                {pending ? 'Criando…' : 'Criar exercício'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
