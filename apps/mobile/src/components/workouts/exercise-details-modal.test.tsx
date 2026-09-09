import { render, screen, userEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseDetailsModal } from './exercise-details-modal';

type ExerciseDetails = NonNullable<ComponentProps<typeof ExerciseDetailsModal>['exercise']>;

const exercise: ExerciseDetails = {
  id: '11111111-1111-4111-8111-111111111111',
  workoutDayId: '22222222-2222-4222-8222-222222222222',
  exerciseId: '33333333-3333-4333-8333-333333333333',
  exerciseOrder: 0,
  sets: 3,
  reps: '10',
  loadKg: 20,
  restSeconds: 60,
  notes: 'Controle a descida.',
  tempo: null,
  exercise: {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Supino',
    muscleGroup: 'Peito',
  },
};

describe('ExerciseDetailsModal', () => {
  it('renderiza todos os detalhes e fecha pela ação acessível', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ExerciseDetailsModal exercise={exercise} onClose={onClose} />);

    expect(screen.getByTestId('bottom-sheet-handle')).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.getByText('Grupo muscular: Peito')).toBeTruthy();
    expect(screen.getByText('3 séries de 10 repetições')).toBeTruthy();
    expect(screen.getByText('Descanso: 60 s')).toBeTruthy();
    expect(screen.getByText('Controle a descida.')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Fechar' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('não renderiza conteúdo sem exercício selecionado', () => {
    render(<ExerciseDetailsModal onClose={() => undefined} />);

    expect(screen.queryByText('Fechar')).toBeNull();
  });
});
