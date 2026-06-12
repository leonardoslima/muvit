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

  it('adds, renames and removes workout days', () => {
    render(<WorkoutEditor studentId="student-id" exercises={exercises} />);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(screen.getByText('Dias (2)')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Treino B'), {
      target: { value: 'Inferior' },
    });

    expect(screen.getByRole('heading', { name: 'Inferior' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('Remover dia')[1]);

    expect(screen.getByText('Dias (1)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Treino A' })).toBeInTheDocument();
  });

  it('edits, reorders and removes selected exercises', () => {
    render(<WorkoutEditor studentId="student-id" exercises={exercises} />);

    fireEvent.click(screen.getByRole('button', { name: /exerc/i }));
    fireEvent.click(screen.getByRole('button', { name: /supino/i }));
    fireEvent.click(screen.getByRole('button', { name: /exerc/i }));
    fireEvent.click(screen.getByRole('button', { name: /remada/i }));

    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '4' } });
    fireEvent.change(screen.getAllByRole('textbox')[2], { target: { value: '8-12' } });
    fireEvent.click(screen.getAllByLabelText('Mover para cima')[1]);

    expect(screen.getAllByText(/Supino|Remada/).map((node) => node.textContent).slice(0, 2)).toEqual([
      'Remada',
      'Supino',
    ]);

    fireEvent.click(screen.getAllByLabelText('Remover')[0]);

    expect(screen.queryByText('Remada')).not.toBeInTheDocument();
    expect(screen.getByText('Supino')).toBeInTheDocument();
  });

  it('submits a draft with notes and renders action errors', async () => {
    vi.mocked(createWorkoutPlanAction).mockResolvedValue({ error: 'Falha ao salvar.' });

    render(<WorkoutEditor studentId="student-id" exercises={exercises} />);

    fireEvent.change(screen.getByLabelText('Nome do treino'), {
      target: { value: 'Rascunho' },
    });
    fireEvent.change(screen.getByLabelText('Notas'), {
      target: { value: 'Progressao semanal' },
    });
    fireEvent.click(screen.getByRole('button', { name: /exerc/i }));
    fireEvent.click(screen.getByRole('button', { name: /supino/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar como rascunho' }));

    await waitFor(() => {
      expect(createWorkoutPlanAction).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Progressao semanal',
          status: 'draft',
        }),
      );
      expect(screen.getByText('Falha ao salvar.')).toBeInTheDocument();
    });
  });

  it('filters the exercise picker and renders the empty result', () => {
    render(<WorkoutEditor studentId="student-id" exercises={exercises} />);

    fireEvent.click(screen.getByRole('button', { name: /exerc/i }));
    fireEvent.change(screen.getByPlaceholderText(/Buscar/), {
      target: { value: 'agachamento' },
    });

    expect(screen.getByText(/encontrado/i)).toBeInTheDocument();
  });
});
