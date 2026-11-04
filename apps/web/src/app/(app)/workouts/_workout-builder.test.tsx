import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkoutBuilder } from './_workout-builder';
import { createWorkoutPlanAction } from './actions';

const navigationState = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('./actions', () => ({
  createWorkoutPlanAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigationState.push }),
}));

const students = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Ana Lima',
    email: 'ana@muvit.test',
    avatarUrl: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Bruno Luz',
    email: 'bruno@muvit.test',
    avatarUrl: null,
  },
];

const exercises = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    name: 'Supino reto',
    muscleGroup: 'chest' as const,
    equipment: 'Barra',
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    name: 'Remada baixa',
    muscleGroup: 'back' as const,
    equipment: 'Cabo',
  },
];

const defaultProps = {
  students,
  exercises,
  equipmentFacets: ['Barra', 'Cabo'],
  initialStudentId: '00000000-0000-4000-8000-000000000001',
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

  it('mantém os identificadores estáveis entre o HTML do servidor e a hidratação', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<WorkoutBuilder {...defaultProps} />);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let root: ReturnType<typeof hydrateRoot> | undefined;

    await act(async () => {
      root = hydrateRoot(container, <WorkoutBuilder {...defaultProps} />);
      await Promise.resolve();
    });

    expect(consoleError.mock.calls.some((call) => String(call[0]).includes('hydrated'))).toBe(
      false,
    );
    if (root) {
      await act(async () => root?.unmount());
    }
    consoleError.mockRestore();
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
    expect(screen.getByLabelText('Séries de Supino reto')).toHaveAttribute('min', '1');
    expect(screen.getByLabelText('Séries de Supino reto')).toHaveAttribute('max', '20');
    expect(screen.getByLabelText('Séries de Supino reto')).toHaveAttribute('step', '1');
    expect(screen.getByLabelText('Descanso de Supino reto')).toHaveAttribute('max', '600');
    expect(screen.getByLabelText('Descanso de Supino reto')).toHaveAttribute('step', '1');
    expect(screen.getByLabelText('Carga de Supino reto')).toHaveAttribute('max', '1000');
    expect(screen.getByLabelText('Repetições de Supino reto')).toHaveAttribute('maxlength', '20');
    expect(screen.getByLabelText('Tempo de Supino reto')).toHaveAttribute('maxlength', '10');
  });

  it('mantém ocorrências duplicadas independentes e preserva o foco ao reordenar várias vezes', () => {
    renderBuilder();
    addExercise('Supino reto');
    addExercise('Supino reto');

    const noteButtons = screen.getAllByRole('button', { name: 'Editar notas de Supino reto' });
    fireEvent.click(requiredElement(noteButtons, 0));
    fireEvent.click(requiredElement(noteButtons, 1));
    const noteInputs = screen.getAllByLabelText('Notas de Supino reto');
    const firstNoteInput = requiredElement(noteInputs, 0);
    const secondNoteInput = requiredElement(noteInputs, 1);
    fireEvent.change(firstNoteInput, { target: { value: 'Primeira ocorrência' } });
    fireEvent.change(secondNoteInput, { target: { value: 'Segunda ocorrência' } });

    expect(firstNoteInput).not.toHaveAttribute('id', secondNoteInput.getAttribute('id'));
    expect(firstNoteInput).toHaveValue('Primeira ocorrência');
    expect(secondNoteInput).toHaveValue('Segunda ocorrência');

    const secondHandle = requiredElement(
      screen.getAllByRole('button', { name: 'Reordenar Supino reto' }),
      1,
    );
    secondHandle.focus();
    fireEvent.keyDown(secondHandle, { key: 'ArrowUp' });
    expect(secondHandle).toHaveFocus();
    expect(screen.getAllByRole('button', { name: 'Reordenar Supino reto' })[0]).toBe(secondHandle);
    fireEvent.keyDown(secondHandle, { key: 'ArrowDown' });
    expect(secondHandle).toHaveFocus();
    expect(screen.getAllByRole('button', { name: 'Reordenar Supino reto' })[1]).toBe(secondHandle);
  });

  it('navega nas tabs por teclado e preserva a relação com o painel durante a renomeação', () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar dia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar dia' }));

    const firstTab = screen.getByRole('tab', { name: 'Treino A' });
    firstTab.focus();
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    const secondTab = screen.getByRole('tab', { name: 'Treino B' });
    expect(secondTab).toHaveFocus();
    expect(secondTab).toHaveAttribute('aria-selected', 'true');
    const tabId = secondTab.id;
    const panelId = secondTab.getAttribute('aria-controls');

    fireEvent.keyDown(secondTab, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Treino C' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Treino C' }), { key: 'Home' });
    expect(firstTab).toHaveFocus();
    fireEvent.keyDown(firstTab, { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Treino C' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Renomear Treino B' }));
    const stableTab = screen.getByRole('tab', { name: 'Treino B' });
    expect(stableTab).toHaveAttribute('id', tabId);
    expect(stableTab).toHaveAttribute('aria-controls', panelId);
    fireEvent.change(screen.getByDisplayValue('Treino B'), { target: { value: 'Inferior' } });
    expect(screen.getByRole('tab', { name: 'Inferior' })).toHaveAttribute('id', tabId);
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
    fireEvent.change(screen.getByLabelText('Aluno'), {
      target: { value: '00000000-0000-4000-8000-000000000002' },
    });
    fireEvent.change(screen.getByLabelText('Nome do plano'), { target: { value: 'Hipertrofia' } });
    addExercise('Supino reto');

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Descartar alterações?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Descartar' }));

    await waitFor(() => expect(screen.getByLabelText('Nome do plano')).toHaveValue(''));
    expect(screen.getByLabelText('Aluno')).toHaveValue('00000000-0000-4000-8000-000000000002');
    expect(screen.getByText('Nenhum exercício ainda')).toBeInTheDocument();
  });

  it('salva o payload integral e mantém o rascunho quando a action retorna erro', async () => {
    vi.mocked(createWorkoutPlanAction).mockResolvedValue({
      success: false,
      error: 'Não foi possível salvar.',
    });
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
        studentId: '00000000-0000-4000-8000-000000000001',
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
                exerciseId: '00000000-0000-4000-8000-000000000101',
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

  it('navega uma única vez após salvar sem exibir erro nem repetir a criação', async () => {
    vi.mocked(createWorkoutPlanAction).mockResolvedValue({
      success: true,
      workoutId: '33333333-3333-4333-8333-333333333333',
    });
    renderBuilder();
    fireEvent.change(screen.getByLabelText('Nome do plano'), { target: { value: 'Plano' } });
    addExercise('Supino reto');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));

    await waitFor(() => {
      expect(navigationState.push).toHaveBeenCalledOnce();
      expect(navigationState.push).toHaveBeenCalledWith(
        '/workouts/33333333-3333-4333-8333-333333333333',
      );
    });
    expect(createWorkoutPlanAction).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('valida o rascunho antes de salvar', () => {
    renderBuilder();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Informe um nome');
    expect(createWorkoutPlanAction).not.toHaveBeenCalled();
  });

  it('associa erros do contrato aos campos e à linha antes de chamar a action', () => {
    renderBuilder();
    fireEvent.change(screen.getByLabelText('Nome do plano'), { target: { value: 'Plano' } });
    addExercise('Supino reto');
    fireEvent.change(screen.getByLabelText('Séries de Supino reto'), {
      target: { value: '1.5' },
    });
    fireEvent.change(screen.getByLabelText('Repetições de Supino reto'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Descanso de Supino reto'), {
      target: { value: '601' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));

    expect(screen.getByLabelText('Séries de Supino reto')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Repetições de Supino reto')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('Descanso de Supino reto')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    const setsInput = screen.getByLabelText('Séries de Supino reto');
    const setsErrorId = setsInput.getAttribute('aria-describedby');
    expect(setsErrorId).not.toBeNull();
    expect(document.getElementById(setsErrorId ?? '')).toHaveTextContent(
      'Use um número inteiro de séries entre 1 e 20.',
    );
    expect(createWorkoutPlanAction).not.toHaveBeenCalled();
  });

  it('transforma rejeição da action em alerta recuperável e permite tentar novamente', async () => {
    vi.mocked(createWorkoutPlanAction)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ success: false, error: 'Serviço ainda indisponível.' });
    renderBuilder();
    fireEvent.change(screen.getByLabelText('Nome do plano'), { target: { value: 'Plano' } });
    addExercise('Supino reto');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar o treino.'),
    );
    expect(screen.getByLabelText('Nome do plano')).toHaveValue('Plano');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Salvar treino' })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Serviço ainda indisponível.'),
    );
    expect(createWorkoutPlanAction).toHaveBeenCalledTimes(2);
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

function requiredElement<T>(elements: T[], index: number): T {
  const element = elements[index];
  if (element === undefined) throw new Error(`Elemento ${index} não encontrado no teste.`);
  return element;
}
