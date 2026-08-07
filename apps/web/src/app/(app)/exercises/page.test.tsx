import { getExercises } from '@/lib/api/sdk.gen';
import type { GetExercisesResponse } from '@/lib/api/types.gen';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createExerciseAction, deleteExerciseAction } from './actions';
import type { CreateExerciseState } from './actions';
import ExercisesPage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({ getExercises: vi.fn() }));
vi.mock('./actions', () => ({ createExerciseAction: vi.fn(), deleteExerciseAction: vi.fn() }));

type Exercise = GetExercisesResponse['items'][number];

function apiOk(
  items: Exercise[] = [
    {
      id: 'exercise-1',
      name: 'Supino reto',
      muscleGroup: 'chest',
      equipment: 'Barra',
      trainerId: 'trainer-1',
      videoUrl: null,
      instructions: null,
      createdAt: '2026-08-07T12:00:00.000Z',
    },
  ],
) {
  return {
    data: { items, total: items.length, facets: { equipment: ['Barra', 'Corda', 'Halteres'] } },
    error: undefined,
    request: new Request('https://api.test'),
    response: new Response(null, { status: 200 }),
  };
}

function apiError() {
  return {
    data: undefined,
    error: { message: 'Falha' },
    request: new Request('https://api.test'),
    response: new Response(null, { status: 500 }),
  };
}

describe('ExercisesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getExercises).mockResolvedValue(apiOk());
    vi.mocked(createExerciseAction).mockResolvedValue(null);
  });

  it('consulta pela busca da URL e preserva os filtros nos links', async () => {
    render(
      await ExercisesPage({
        searchParams: Promise.resolve({
          q: 'supino',
          group: 'chest',
          equipment: 'Barra',
          scope: 'mine',
        }),
      }),
    );

    expect(getExercises).toHaveBeenCalledWith({
      client: {},
      query: {
        q: 'supino',
        muscleGroup: 'chest',
        equipment: 'Barra',
        scope: 'mine',
        limit: 100,
      },
    });
    expect(screen.getByRole('searchbox', { name: 'Buscar exercícios' })).toHaveValue('supino');
    expect(screen.getByRole('link', { name: 'Globais' })).toHaveAttribute(
      'href',
      '/exercises?q=supino&group=chest&equipment=Barra&scope=global',
    );
    expect(screen.getByRole('link', { name: 'Costas' })).toHaveAttribute(
      'href',
      '/exercises?q=supino&group=back&equipment=Barra&scope=mine',
    );
    expect(screen.getByLabelText('Equipamento')).toHaveValue('Barra');
    expect(screen.getByRole('option', { name: 'Corda' })).toBeInTheDocument();
    const equipmentForm = screen.getByLabelText('Equipamento').closest('form');
    expect(equipmentForm).toHaveFormValues({
      q: 'supino',
      group: 'chest',
      equipment: 'Barra',
      scope: 'mine',
    });
  });

  it('renderiza o placeholder visual e os metadados do card', async () => {
    render(await ExercisesPage({ searchParams: Promise.resolve({}) }));

    const exercise = screen.getByRole('article', { name: 'Supino reto' });
    expect(
      within(exercise).getByRole('img', { name: 'Ilustração de Supino reto' }),
    ).toBeInTheDocument();
    expect(within(exercise).getByText('Peito')).toBeInTheDocument();
    expect(within(exercise).getByText('Barra')).toBeInTheDocument();
  });

  it('diferencia biblioteca vazia de filtro sem resultado', async () => {
    vi.mocked(getExercises).mockResolvedValue(apiOk([]));

    const emptyLibrary = render(await ExercisesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText('Sua biblioteca de exercícios está vazia.')).toBeInTheDocument();

    emptyLibrary.unmount();
    render(await ExercisesPage({ searchParams: Promise.resolve({ q: 'inexistente' }) }));
    expect(screen.getByText('Nenhum exercício corresponde aos filtros.')).toBeInTheDocument();
  });

  it('mostra erro de carregamento sem ocultar a busca e a criação', async () => {
    vi.mocked(getExercises).mockResolvedValue(apiError());

    render(await ExercisesPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os exercícios.');
    expect(screen.getByRole('searchbox', { name: 'Buscar exercícios' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo exercício' })).toBeInTheDocument();
  });

  it('abre o modal acessível de exercício personalizado', async () => {
    render(await ExercisesPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(screen.getByRole('button', { name: 'Novo exercício' }));

    const dialog = screen.getByRole('dialog', { name: 'Novo exercício personalizado' });
    expect(within(dialog).getByLabelText('Nome do exercício')).toBeRequired();
    expect(within(dialog).getByLabelText('Grupo muscular')).toBeRequired();
    expect(within(dialog).getByLabelText('URL do vídeo (opcional)')).toHaveAttribute(
      'name',
      'videoUrl',
    );
  });

  it('associa os erros de validação aos campos do modal', async () => {
    vi.mocked(createExerciseAction).mockResolvedValue({
      fieldErrors: {
        name: 'Informe um nome.',
        muscleGroup: 'Selecione um grupo muscular.',
      },
    });
    render(await ExercisesPage({ searchParams: Promise.resolve({}) }));
    fireEvent.click(screen.getByRole('button', { name: 'Novo exercício' }));
    const dialog = screen.getByRole('dialog', { name: 'Novo exercício personalizado' });
    const submitButton = within(dialog).getByRole('button', { name: 'Criar exercício' });
    const form = submitButton.closest('form');
    expect(form).toBeInstanceOf(HTMLFormElement);
    if (!form) throw new Error('Formulário de exercício não encontrado.');

    fireEvent.submit(form);

    expect(await within(dialog).findByText('Informe um nome.')).toHaveAttribute('id', 'name-error');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Informe um nome.');
    expect(within(dialog).getByLabelText('Nome do exercício')).toHaveFocus();
    expect(within(dialog).getByLabelText('Nome do exercício')).toHaveAttribute(
      'aria-describedby',
      'name-error',
    );
    expect(within(dialog).getByLabelText('Grupo muscular')).toHaveAttribute(
      'aria-describedby',
      'muscle-group-error',
    );
  });

  it('desabilita a criação enquanto a action está pendente', async () => {
    let resolveAction: ((value: CreateExerciseState) => void) | undefined;
    const pendingAction = new Promise<CreateExerciseState>((resolve) => {
      resolveAction = resolve;
    });
    vi.mocked(createExerciseAction).mockImplementation(() => pendingAction);
    render(await ExercisesPage({ searchParams: Promise.resolve({}) }));
    fireEvent.click(screen.getByRole('button', { name: 'Novo exercício' }));
    const dialog = screen.getByRole('dialog', { name: 'Novo exercício personalizado' });
    const submitButton = within(dialog).getByRole('button', { name: 'Criar exercício' });
    const form = submitButton.closest('form');
    expect(form).toBeInstanceOf(HTMLFormElement);
    if (!form) throw new Error('Formulário de exercício não encontrado.');

    fireEvent.submit(form);

    expect(await within(dialog).findByRole('button', { name: 'Criando…' })).toBeDisabled();
    resolveAction?.(null);
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Novo exercício personalizado' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('confirma a exclusão com o identificador do exercício', async () => {
    vi.mocked(deleteExerciseAction).mockResolvedValue(undefined);
    render(await ExercisesPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Supino reto' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Excluir exercício?' });
    expect(within(dialog).getByText(/Supino reto/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir exercício' }));

    await waitFor(() => expect(deleteExerciseAction).toHaveBeenCalledOnce());
    const formData = vi.mocked(deleteExerciseAction).mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData?.get('id')).toBe('exercise-1');
  });
});
