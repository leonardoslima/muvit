import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteExerciseAction } from './actions';
import ExercisesPage from './page';

vi.mock('@/components/top-bar', () => ({ TopBar: () => <div>Exercícios</div> }));
vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({
  getExercises: vi.fn().mockResolvedValue({
    data: {
      items: [
        {
          id: 'exercise-1',
          name: 'Supino reto',
          muscleGroup: 'chest',
          equipment: 'Barra',
          trainerId: 'trainer-1',
        },
      ],
    },
  }),
}));
vi.mock('./_create-dialog', () => ({ CreateExerciseDialog: () => null }));
vi.mock('./actions', () => ({ deleteExerciseAction: vi.fn() }));

describe('ExercisesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('confirma a exclusão com o identificador do exercício', async () => {
    vi.mocked(deleteExerciseAction).mockResolvedValue(undefined);
    render(await ExercisesPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Supino reto' }));
    const dialog = screen.getByRole('dialog', { name: 'Excluir exercício?' });
    expect(within(dialog).getByText(/Supino reto/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir exercício' }));

    await waitFor(() => expect(deleteExerciseAction).toHaveBeenCalledOnce());
    const formData = vi.mocked(deleteExerciseAction).mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData?.get('id')).toBe('exercise-1');
  });
});
