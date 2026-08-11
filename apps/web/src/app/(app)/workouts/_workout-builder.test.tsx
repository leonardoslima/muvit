import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkoutBuilder } from './_workout-builder';
import { createWorkoutPlanAction } from './actions';

vi.mock('./actions', () => ({
  createWorkoutPlanAction: vi.fn(),
}));

const students = [
  { id: 'student-1', name: 'Ana Lima', email: 'ana@muvit.test', avatarUrl: null },
  { id: 'student-2', name: 'Bruno Luz', email: 'bruno@muvit.test', avatarUrl: null },
];

const exercises = [
  { id: 'exercise-1', name: 'Supino reto', muscleGroup: 'chest' as const, equipment: 'Barra' },
  { id: 'exercise-2', name: 'Remada baixa', muscleGroup: 'back' as const, equipment: 'Cabo' },
];

const defaultProps = {
  students,
  exercises,
  equipmentFacets: ['Barra', 'Cabo'],
  initialStudentId: 'student-1',
  studentsError: false,
  exercisesError: false,
};

function renderBuilder(overrides: Partial<typeof defaultProps> = {}) {
  return render(<WorkoutBuilder {...defaultProps} {...overrides} />);
}

function openDrawer(): HTMLElement {
  const trigger = screen.getByRole('button', { name: 'Adicionar exercício' });
  fireEvent.click(trigger);
  return screen.getByRole('dialog', { name: 'Adicionar exercício' });
}

function addExercise(name: string): void {
  const drawer = openDrawer();
  fireEvent.click(within(drawer).getByRole('button', { name: `Adicionar ${name}` }));
}

describe('WorkoutBuilder', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('ocupa a superfície disponível sem reduzir o editor central', () => {
    renderBuilder();

    expect(screen.getByRole('heading', { name: 'Detalhes do treino' })).toBeInTheDocument();
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.getByText('Nenhum exercício ainda')).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Construtor de treino' })).toHaveClass(
      'min-h-0',
      'flex-1',
      'overflow-hidden',
    );
    expect(screen.getByRole('region', { name: 'Editor do treino' })).toHaveClass(
      'min-w-0',
      'flex-1',
    );
  });

  it('abre o drawer, move o foco e fecha por Escape devolvendo o foco ao gatilho', async () => {
    renderBuilder();

    const trigger = screen.getByRole('button', { name: 'Adicionar exercício' });
    const drawer = openDrawer();
    const search = within(drawer).getByRole('searchbox', { name: 'Buscar exercícios' });

    await waitFor(() => expect(search).toHaveFocus());
    expect(drawer).toHaveClass('lg:absolute', 'lg:w-80');
    expect(document.querySelector('[data-slot="dialog-overlay"]')).toHaveClass('lg:hidden');

    fireEvent.keyDown(drawer, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Adicionar exercício' })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it('filtra a biblioteca por busca, grupo e equipamento antes de adicionar', () => {
    renderBuilder();

    const drawer = openDrawer();
    fireEvent.change(within(drawer).getByRole('searchbox', { name: 'Buscar exercícios' }), {
      target: { value: 'remada' },
    });
    fireEvent.change(within(drawer).getByLabelText('Grupo muscular'), {
      target: { value: 'back' },
    });
    fireEvent.change(within(drawer).getByLabelText('Equipamento'), {
      target: { value: 'Cabo' },
    });

    expect(within(drawer).queryByText('Supino reto')).not.toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Adicionar Remada baixa' }));

    expect(screen.queryByRole('dialog', { name: 'Adicionar exercício' })).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Exercícios de Treino A' })).toBeInTheDocument();
    expect(screen.getByText('Remada baixa')).toBeInTheDocument();
  });

  it('edita a tabela, alterna notas e reordena por teclado', () => {
    renderBuilder();
    addExercise('Supino reto');
    addExercise('Remada baixa');

    fireEvent.change(screen.getByLabelText('Séries de Supino reto'), {
      target: { value: '4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Editar notas de Supino reto' }));
    fireEvent.change(screen.getByLabelText('Notas de Supino reto'), {
      target: { value: 'Controlar a descida' },
    });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Reordenar Remada baixa' }), {
      key: 'ArrowUp',
    });

    expect(
      screen
        .getAllByRole('button', { name: /Reordenar/ })
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Reordenar Remada baixa', 'Reordenar Supino reto']);
    expect(screen.getByDisplayValue('Controlar a descida')).toBeInTheDocument();
  });

  it('confirma remoções de exercício e dia e permite renomear o dia ativo', async () => {
    renderBuilder();
    addExercise('Supino reto');

    fireEvent.click(screen.getByRole('button', { name: 'Remover Supino reto' }));
    const exerciseDialog = screen.getByRole('alertdialog', { name: 'Remover exercício?' });
    expect(screen.getByText('Supino reto')).toBeInTheDocument();
    fireEvent.click(within(exerciseDialog).getByRole('button', { name: 'Remover exercício' }));
    await waitFor(() => expect(screen.getByText('Nenhum exercício ainda')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar dia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Renomear Treino B' }));
    fireEvent.change(screen.getByDisplayValue('Treino B'), { target: { value: 'Inferior' } });
    fireEvent.keyDown(screen.getByDisplayValue('Inferior'), { key: 'Enter' });
    expect(screen.getByRole('tab', { name: 'Inferior' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Remover Inferior' }));
    const dayDialog = screen.getByRole('alertdialog', { name: 'Remover dia?' });
    fireEvent.click(within(dayDialog).getByRole('button', { name: 'Remover dia' }));
    await waitFor(() =>
      expect(screen.queryByRole('tab', { name: 'Inferior' })).not.toBeInTheDocument(),
    );
  });

  it('descarta o rascunho após confirmação sem trocar o aluno selecionado', async () => {
    renderBuilder();
    fireEvent.change(screen.getByLabelText('Aluno'), { target: { value: 'student-2' } });
    fireEvent.change(screen.getByLabelText('Nome do plano'), { target: { value: 'Hipertrofia' } });
    addExercise('Supino reto');

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Descartar alterações?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Descartar' }));

    await waitFor(() => expect(screen.getByLabelText('Nome do plano')).toHaveValue(''));
    expect(screen.getByLabelText('Aluno')).toHaveValue('student-2');
    expect(screen.getByText('Nenhum exercício ainda')).toBeInTheDocument();
  });

  it('salva o payload integral e mantém o rascunho quando a action retorna erro', async () => {
    vi.mocked(createWorkoutPlanAction).mockResolvedValue({ error: 'Não foi possível salvar.' });
    renderBuilder();

    fireEvent.change(screen.getByLabelText('Nome do plano'), {
      target: { value: ' Hipertrofia ' },
    });
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-08-10' } });
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } });
    fireEvent.change(screen.getByLabelText('Notas gerais'), { target: { value: ' Progressão ' } });
    addExercise('Supino reto');
    fireEvent.change(screen.getByLabelText('Séries de Supino reto'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Repetições de Supino reto'), {
      target: { value: '8-12' },
    });
    fireEvent.change(screen.getByLabelText('Carga de Supino reto'), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText('Descanso de Supino reto'), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText('Tempo de Supino reto'), { target: { value: '3-1-1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));

    await waitFor(() => {
      expect(createWorkoutPlanAction).toHaveBeenCalledWith({
        studentId: 'student-1',
        name: 'Hipertrofia',
        startDate: '2026-08-10',
        endDate: '2026-09-10',
        status: 'active',
        notes: 'Progressão',
        days: [
          {
            label: 'Treino A',
            dayOrder: 0,
            exercises: [
              {
                exerciseId: 'exercise-1',
                exerciseOrder: 0,
                sets: 4,
                reps: '8-12',
                restSeconds: 90,
                loadKg: 42,
                tempo: '3-1-1',
                notes: undefined,
              },
            ],
          },
        ],
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar.');
      expect(screen.getByLabelText('Nome do plano')).toHaveValue(' Hipertrofia ');
    });
  });

  it('valida o rascunho antes de salvar', () => {
    renderBuilder();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Informe um nome para o treino.');
    expect(createWorkoutPlanAction).not.toHaveBeenCalled();
  });

  it('orienta quando não há aluno e expõe falhas ou ausência da biblioteca', () => {
    const { rerender } = renderBuilder({ students: [], initialStudentId: '' });

    expect(screen.getByText('Cadastre um aluno ativo para criar um treino.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar aluno' })).toHaveAttribute(
      'href',
      '/students/new',
    );
    expect(screen.getByRole('button', { name: 'Salvar treino' })).toBeDisabled();

    rerender(<WorkoutBuilder {...defaultProps} studentsError exercisesError />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os alunos.');
    const errorDrawer = openDrawer();
    expect(screen.getAllByRole('alert').at(-1)).toHaveTextContent(
      'Não foi possível carregar os exercícios.',
    );
    fireEvent.click(within(errorDrawer).getByRole('button', { name: 'Fechar' }));

    rerender(<WorkoutBuilder {...defaultProps} exercises={[]} equipmentFacets={[]} />);
    openDrawer();
    expect(screen.getByText('A biblioteca de exercícios está vazia.')).toBeInTheDocument();
  });
});
