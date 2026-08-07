'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL } from '@/lib/muscle-groups';
import { Plus, X } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { type CreateExerciseState, createExerciseAction } from './actions';

export function CreateExerciseDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CreateExerciseState, FormData>(
    createExerciseAction,
    null,
  );

  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (submitted && !pending && !state?.error && !state?.fieldErrors) {
      setOpen(false);
      setSubmitted(false);
    }
  }, [submitted, pending, state]);

  const fe = state?.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus />
          Novo exercício
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-40 bg-foreground/40 backdrop-blur-sm"
        className="block max-w-140 overflow-hidden rounded-lg bg-card p-0 text-foreground shadow-elevated ring-0 sm:max-w-140"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div className="flex flex-col gap-1">
            <DialogTitle className="font-display text-xl font-bold">
              Novo exercício personalizado
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Adicione um exercício personalizado à sua biblioteca.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </DialogClose>
        </div>

        <form
          action={(fd) => {
            setSubmitted(true);
            formAction(fd);
          }}
          className="flex flex-col"
        >
          <div className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" data-error={!!fe.name}>
                Nome do exercício
              </Label>
              <Input
                id="name"
                name="name"
                required
                aria-invalid={!!fe.name}
                aria-describedby={fe.name ? 'name-error' : undefined}
                placeholder="Ex.: Agachamento búlgaro"
                className="bg-background"
              />
              {fe.name && (
                <p id="name-error" className="text-xs text-destructive">
                  {fe.name}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="muscleGroup" data-error={!!fe.muscleGroup}>
                  Grupo muscular
                </Label>
                <select
                  id="muscleGroup"
                  name="muscleGroup"
                  required
                  aria-invalid={!!fe.muscleGroup}
                  aria-describedby={fe.muscleGroup ? 'muscle-group-error' : undefined}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm"
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
                {fe.muscleGroup && (
                  <p id="muscle-group-error" className="text-xs text-destructive">
                    {fe.muscleGroup}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="equipment">Equipamento (opcional)</Label>
                <Input
                  id="equipment"
                  name="equipment"
                  placeholder="Halteres"
                  className="bg-background"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="instructions">Instruções (opcional)</Label>
              <textarea
                id="instructions"
                name="instructions"
                rows={3}
                placeholder="Adicione orientações ou observações importantes..."
                className="resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="videoUrl">URL do vídeo (opcional)</Label>
              <Input
                id="videoUrl"
                name="videoUrl"
                type="url"
                placeholder="https://..."
                className="bg-background"
              />
            </div>
            {state?.error && (
              <p className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? 'Criando…' : 'Criar exercício'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
