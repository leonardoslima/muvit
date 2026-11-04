import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../application/exercises/exercise-catalog';
import { controlSizes } from '../../lib/design-system/tokens';
import { ExerciseCatalogModal } from './exercise-catalog-modal';

const EXERCISE_ID = '00000000-0000-0000-0000-000000000101';
const SECOND_EXERCISE_ID = '00000000-0000-0000-0000-000000000102';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('../../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
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

  return { ...view, onClose, onSelect, queryClient };
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
  apiState.request.mockResolvedValue({ items: [], total: 0 });
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

  it('abre com scope all e mostra loading', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderModal();

    expect(apiState.request).toHaveBeenCalledWith('/exercises?scope=all&limit=50&offset=0', {
      signal: expect.anything(),
    });
    expect(screen.getByText('Carregando exercícios')).toBeTruthy();
  });

  it('permite retry da primeira página depois de erro inicial', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 });

    renderModal();

    expect(await screen.findByText('Não foi possível carregar os exercícios')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Supino reto')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(2);
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

  it('busca automaticamente após uma pausa e permite limpar pelo campo', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 })
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 });

    renderModal();
    await screen.findByText('Supino reto');
    await user.type(screen.getByLabelText('Buscar exercício'), '  remada  ');

    expect(apiState.request).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Buscar' })).toBeNull();
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

  it('espera 400 ms desde a última alteração e descarta a busca pendente ao limpar', async () => {
    apiState.request.mockResolvedValue({ items: [exerciseFixture()], total: 1 });
    renderModal();
    await screen.findByText('Supino reto');
    vi.useFakeTimers();
    try {
      fireEvent.changeText(screen.getByLabelText('Buscar exercício'), 're');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      fireEvent.changeText(screen.getByLabelText('Buscar exercício'), 'remada');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(399);
      });
      expect(apiState.request).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(apiState.request).toHaveBeenLastCalledWith(
        '/exercises?scope=all&q=remada&limit=50&offset=0',
        expect.any(Object),
      );

      fireEvent.changeText(screen.getByLabelText('Buscar exercício'), 'agachamento');
      fireEvent.press(screen.getByRole('button', { name: 'Limpar busca' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(screen.getByLabelText('Buscar exercício').props.value).toBe('');
      expect(apiState.request.mock.calls.some(([path]) => path.includes('agachamento'))).toBe(
        false,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancela a busca anterior ao digitar e ignora a resposta antiga', async () => {
    const previous = deferred<{ items: Exercise[]; total: number }>();
    apiState.request
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockReturnValueOnce(previous.promise)
      .mockResolvedValueOnce({ items: [exerciseFixture({ name: 'Remada baixa' })], total: 1 });
    renderModal();
    await screen.findByText('Nenhum exercício encontrado');
    fireEvent.changeText(screen.getByLabelText('Buscar exercício'), 'supino');
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    const signal = apiState.request.mock.calls[1]?.[1]?.signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    fireEvent.changeText(screen.getByLabelText('Buscar exercício'), 'remada');
    expect(signal.aborted).toBe(true);
    expect(await screen.findByText('Remada baixa')).toBeTruthy();
    await act(async () => {
      previous.resolve({ items: [exerciseFixture()], total: 1 });
    });
    expect(screen.queryByText('Supino reto')).toBeNull();
  });

  it('reinicia a paginação ao mudar a busca e não mostra itens do termo anterior', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 2 })
      .mockResolvedValueOnce({
        items: [exerciseFixture({ id: SECOND_EXERCISE_ID, name: 'Agachamento' })],
        total: 2,
      })
      .mockResolvedValueOnce({ items: [exerciseFixture({ name: 'Remada baixa' })], total: 1 });
    renderModal();
    await screen.findByText('Supino reto');
    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));
    await screen.findByText('Agachamento');
    fireEvent.changeText(screen.getByLabelText('Buscar exercício'), 'remada');
    expect(screen.queryByText('Agachamento')).toBeNull();
    await screen.findByText('Remada baixa');
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/exercises?scope=all&q=remada&limit=50&offset=0',
      expect.any(Object),
    );
    expect(screen.queryByText('Supino reto')).toBeNull();
  });

  it('preserva o grupo muscular ao limpar somente o termo de busca', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [], total: 0 });

    renderModal();
    await screen.findByText('Nenhum exercício encontrado');
    await user.press(screen.getByLabelText('Peito'));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));

    const filter = screen.getByLabelText('Peito');
    expect(filter.props.style).toEqual(expect.objectContaining({ minHeight: controlSizes.touch }));
    expect(filter.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));

    await user.type(screen.getByLabelText('Buscar exercício'), '  supino  ');
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(3));
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/exercises?scope=all&q=supino&muscleGroup=chest&limit=50&offset=0',
      expect.any(Object),
    );

    await user.press(screen.getByRole('button', { name: 'Limpar busca' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(4));
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/exercises?scope=all&muscleGroup=chest&limit=50&offset=0',
      expect.any(Object),
    );
    expect(screen.getByLabelText('Peito').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
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

  it('avança pelo total de itens carregados e mantém page size 50', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({
        items: [
          exerciseFixture(),
          exerciseFixture({ id: SECOND_EXERCISE_ID, name: 'Remada baixa' }),
        ],
        total: 5,
      })
      .mockResolvedValueOnce({
        items: [
          exerciseFixture({ id: '00000000-0000-0000-0000-000000000103', name: 'Agachamento' }),
        ],
        total: 5,
      })
      .mockResolvedValueOnce({
        items: [exerciseFixture({ id: '00000000-0000-0000-0000-000000000104', name: 'Leg press' })],
        total: 5,
      });

    renderModal();
    await screen.findByText('Supino reto');
    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));
    await screen.findByText('Agachamento');
    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));
    await screen.findByText('Leg press');

    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(3));
    expect(apiState.request).toHaveBeenNthCalledWith(
      1,
      '/exercises?scope=all&limit=50&offset=0',
      expect.any(Object),
    );
    expect(apiState.request).toHaveBeenNthCalledWith(
      2,
      '/exercises?scope=all&limit=50&offset=2',
      expect.any(Object),
    );
    expect(apiState.request).toHaveBeenNthCalledWith(
      3,
      '/exercises?scope=all&limit=50&offset=3',
      expect.any(Object),
    );
  });

  it('mantém itens vazios e mostra estado vazio', async () => {
    apiState.request.mockResolvedValueOnce({ items: [], total: 0 });

    renderModal();

    expect(await screen.findByText('Nenhum exercício encontrado')).toBeTruthy();
  });

  it('mantém busca e fechamento disponíveis e bloqueia seleção durante paginação', async () => {
    const request = deferred<{ items: Exercise[]; total: number }>();
    const user = userEvent.setup();
    const onSelect = vi.fn();
    apiState.request
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 2 })
      .mockReturnValueOnce(request.promise);

    const { onClose } = renderModal({ onSelect });
    await screen.findByText('Supino reto');
    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Buscar exercício').props.editable).toBe(true);
      expect(
        screen.getByRole('button', { name: 'Carregar mais' }).props.accessibilityState,
      ).toEqual(expect.objectContaining({ disabled: true }));
    });
    expect(screen.getByLabelText('Peito').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(
      screen.getByRole('button', { name: 'Fechar catálogo' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: false }));
    expect(
      screen.getByRole('button', { name: 'Selecionar Supino reto, Peito' }).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));
    await user.press(screen.getByLabelText('Peito'));
    await user.press(screen.getByRole('button', { name: 'Selecionar Supino reto, Peito' }));
    expect(apiState.request).toHaveBeenCalledTimes(2);
    expect(onSelect).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Fechar catálogo' }));
    expect(onClose).toHaveBeenCalledOnce();

    await act(async () => {
      request.resolve({
        items: [exerciseFixture({ id: SECOND_EXERCISE_ID, name: 'Remada baixa' })],
        total: 2,
      });
    });
    expect(await screen.findByText('Remada baixa')).toBeTruthy();
  });

  it('preserva busca digitada e grupo ao fechar e reabrir', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 })
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 })
      .mockResolvedValueOnce({ items: [exerciseFixture()], total: 1 });

    const { onClose, onSelect, queryClient, rerender } = renderModal();
    await screen.findByText('Supino reto');
    await user.type(screen.getByLabelText('Buscar exercício'), '  remada  ');
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    await user.press(screen.getByLabelText('Costas'));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(3));

    rerender(
      <QueryClientProvider client={queryClient}>
        <ExerciseCatalogModal visible={false} onClose={onClose} onSelect={onSelect} />
      </QueryClientProvider>,
    );
    rerender(
      <QueryClientProvider client={queryClient}>
        <ExerciseCatalogModal visible onClose={onClose} onSelect={onSelect} />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText('Buscar exercício').props.value).toBe('  remada  ');
    expect(screen.getByLabelText('Costas').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(await screen.findByText('Supino reto')).toBeTruthy();
  });

  it('reserva altura de 92 por cento para a SheetSurface independentemente dos resultados', () => {
    renderModal();

    expect(screen.getByTestId('exercise-catalog-sheet').props.style).toEqual(
      expect.objectContaining({ height: '92%', maxHeight: '92%' }),
    );
  });
});
