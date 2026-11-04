import { Button } from '@/components/ui/button';
import { Dumbbell, Plus } from 'lucide-react';
import type { RefObject } from 'react';

interface WorkoutEmptyStateProps {
  onAddExercise: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

export function WorkoutEmptyState({ onAddExercise, triggerRef }: WorkoutEmptyStateProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10 text-center">
      <div className="flex max-w-sm flex-col items-center">
        <span className="mb-5 grid size-16 place-items-center rounded-full bg-success-bg text-primary">
          <Dumbbell className="size-7" aria-hidden="true" />
        </span>
        <h3 className="font-display text-xl font-bold">Nenhum exercício ainda</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Adicione exercícios da biblioteca para montar o treino deste dia.
        </p>
        <Button ref={triggerRef} type="button" className="mt-6" onClick={onAddExercise}>
          <Plus aria-hidden="true" />
          Adicionar exercício
        </Button>
      </div>
    </div>
  );
}
