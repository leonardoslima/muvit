import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkoutEditor } from './_editor';
import { createWorkoutPlanAction } from './actions';

vi.mock('./actions', () => ({
  createWorkoutPlanAction: vi.fn(),
}));

const exercises = [
  { id: 'ex-1', name: 'Supino', muscleGroup: 'chest' as const },
  { id: 'ex-2', name: 'Remada', muscleGroup: 'back' as const },
];

describe('WorkoutEditor', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('validates required workout data before saving', () => {
    render(<WorkoutEditor studentId="student-id" exercises={exercises} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));

    expect(screen.getByText('Informe um nome para o treino.')).toBeInTheDocument();
    expect(createWorkoutPlanAction).not.toHaveBeenCalled();
  });

  it('adds an exercise and submits an active workout', async () => {
    vi.mocked(createWorkoutPlanAction).mockResolvedValue(undefined);

    render(<WorkoutEditor studentId="student-id" exercises={exercises} />);

    fireEvent.change(screen.getByLabelText('Nome do treino'), {
      target: { value: 'Hipertrofia' },
    });
    fireEvent.click(screen.getByRole('button', { name: /exerc/i }));
    fireEvent.click(screen.getByRole('button', { name: /supino/i }));

    expect(screen.getByText('Supino')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));

    await waitFor(() => {
      expect(createWorkoutPlanAction).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'student-id',
          name: 'Hipertrofia',
          status: 'active',
          days: [
            expect.objectContaining({
              exercises: [expect.objectContaining({ exerciseId: 'ex-1' })],
            }),
          ],
        }),
      );
    });
  });
});
