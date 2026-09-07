import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../application/exercises/exercise-catalog';
import { ExerciseCatalogModal } from './exercise-catalog-modal';

const EXERCISE_ID = '00000000-0000-0000-0000-000000000101';
const SECOND_EXERCISE_ID = '00000000-0000-0000-0000-000000000102';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('../../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

function exerciseFixture(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: EXERCISE_ID,
    trainerId: null,
    name: 'Supino reto',
    muscleGroup: 'chest',
    equipment: 'Barra',
    videoUrl: null,
    instructions: null,
    createdAt: '2026-09-06T12:00:00.000Z',
    ...overrides,
  };
}

function renderModal(props: Partial<React.ComponentProps<typeof ExerciseCatalogModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  const onSelect = vi.fn();

  const view = render(
    <QueryClientProvider client={queryClient}>
      <ExerciseCatalogModal visible onClose={onClose} onSelect={onSelect} {...props} />
    </QueryClientProvider>,
  );

  return { ...view, onClose, onSelect };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolvePromise: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return { promise, resolve: resolvePromise };
}

beforeEach(() => {
  apiState.request.mockReset();
});

describe('ExerciseCatalogModal', () => {
  it('não faz request quando está fechado', () => {
    renderModal({ visible: false });

    expect(apiState.request).not.toHaveBeenCalled();
  });

  it('fecha explicitamente', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce({ items: [], total: 0 });
    const { onClose } = renderModal();

    await user.press(screen.getByRole('button', { name: 'Fechar catálogo' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('abre com scope all, mostra loading e permite retry de erro inicial', async () => {
    const user = userEvent.setup();
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderModal();

    expect(apiState.request).toHaveBeenCalledWith('/exercises?scope=all&limit=50&offset=0', {
      signal: expect.anything(),
    });
    expect(screen.getByText('Carregando exercícios')).toBeTruthy();
  });

  it('renderiza item, label muscular, equipamento e seleciona o exercício', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 });

    const { onClose, onSelect } = renderModal();

    expect(await screen.findByText('Supino reto')).toBeTruthy();
    expect(screen.getByText('Barra')).toBeTruthy();
    expect(screen.getAllByText('Peito')).toHaveLength(2);

    await user.press(screen.getByRole('button', { name: 'Selecionar Supino reto, Peito' }));

    expect(onSelect).toHaveBeenCalledWith(exerciseFixture());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Criar exercício' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar exercício' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir exercício' })).toBeNull();
  });

  it('fecha pelo botão e omite equipamento ausente', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce({
      items: [exerciseFixture({ equipment: null })],
      total: 1,
    });

    const { onClose } = renderModal();
    await screen.findByText('Supino reto');

    expect(screen.queryByText('Barra')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Fechar catálogo' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('aplica busca somente ao submeter e permite limpar', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 })
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 });

    renderModal();
    await screen.findByText('Supino reto');
    await user.type(screen.getByLabelText('Buscar exercício'), '  remada  ');

    expect(apiState.request).toHaveBeenCalledTimes(1);
    await user.press(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/exercises?scope=all&q=remada&limit=50&offset=0',
      expect.any(Object),
    );

    await user.press(screen.getByRole('button', { name: 'Limpar busca' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(3));
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/exercises?scope=all&limit=50&offset=0',
      expect.any(Object),
    );
  });

  it('filtra por grupo muscular e reinicia offset', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 });

    renderModal();
    await screen.findByText('Nenhum exercício encontrado');
    await user.press(screen.getByLabelText('Peito'));

    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/exercises?scope=all&muscleGroup=chest&limit=50&offset=0',
      expect.any(Object),
    );
  });

  it('carrega mais com offset acumulado e preserva itens em erro de paginação', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 2 })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        items: [exerciseFixture({ id: SECOND_EXERCISE_ID, name: 'Remada baixa' })],
        total: 2,
      });

    renderModal();
    await screen.findByText('Supino reto');
    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('Não foi possível carregar mais exercícios.')).toBeTruthy();
    expect(screen.getByText('Supino reto')).toBeTruthy();
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/exercises?scope=all&limit=50&offset=1',
      expect.any(Object),
    );

    await user.press(screen.getByRole('button', { name: 'Tentar carregar mais' }));
    expect(await screen.findByText('Remada baixa')).toBeTruthy();
  });

  it('mantém itens vazios e mostra estado vazio', async () => {
    apiState.request.mockResolvedValueOnce({ items: [], total: 0 });

    renderModal();

    expect(await screen.findByText('Nenhum exercício encontrado')).toBeTruthy();
  });

  it('bloqueia busca e filtros durante fetch concorrente', async () => {
    const request = deferred<{ items: Exercise[]; total: number }>();
    const user = userEvent.setup();
    apiState.request.mockReturnValueOnce(request.promise);

    renderModal();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Buscar' }).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });
    expect(screen.getByLabelText('Peito').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    await user.press(screen.getByRole('button', { name: 'Buscar' }));
    expect(apiState.request).toHaveBeenCalledTimes(1);

    await act(async () => {
      request.resolve({ items: [], total: 0 });
    });
    expect(await screen.findByText('Nenhum exercício encontrado')).toBeTruthy();
  });
});
