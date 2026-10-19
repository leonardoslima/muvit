import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainerStudent } from '../application/trainer/trainer-data';
import { TrainerStudentsScreen } from './trainer-students';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('expo-router', () => ({
  router: routerState,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

function studentFixture(overrides: Partial<TrainerStudent> = {}): TrainerStudent {
  return {
    id: 'student-1',
    trainerId: 'trainer-1',
    isIndependent: false,
    name: 'Ana Lima',
    email: 'ana@example.com',
    phone: '27999999999',
    birthDate: null,
    gender: null,
    goals: null,
    restrictions: null,
    status: 'active',
    avatarUrl: null,
    expoPushToken: null,
    createdAt: '2026-08-31T12:00:00.000Z',
    ...overrides,
  };
}

function renderTrainerStudents() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerStudentsScreen />
    </QueryClientProvider>,
  );
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolvePromise = (_value: T): void => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return { promise, resolve: resolvePromise };
}

beforeEach(() => {
  apiState.request.mockReset();
  routerState.push.mockReset();
});

describe('TrainerStudentsScreen', () => {
  it('carrega a carteira e abre o detalhe enviando somente o id', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce({
      total: 1,
      items: [studentFixture({ id: 'student-1', name: 'Ana Lima' })],
    });

    renderTrainerStudents();

    expect(await screen.findByText('Ana Lima')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Abrir Ana Lima' }));

    expect(routerState.push).toHaveBeenCalledWith({
      pathname: '/trainer/students/[studentId]',
      params: { studentId: 'student-1' },
    });
  });

  it('busca após 400 ms sem digitar e limpa pelo X dentro do campo', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({
        total: 2,
        items: [
          studentFixture({ name: 'Ana Júlia' }),
          studentFixture({ id: 'student-2', name: 'Bruna Lima' }),
        ],
      })
      .mockResolvedValueOnce({ total: 1, items: [studentFixture({ name: 'Ana Júlia' })] })
      .mockResolvedValueOnce({
        total: 2,
        items: [
          studentFixture({ name: 'Ana Júlia' }),
          studentFixture({ id: 'student-2', name: 'Bruna Lima' }),
        ],
      });

    renderTrainerStudents();

    await screen.findByText('Bruna Lima');
    vi.useFakeTimers();
    try {
      fireEvent.changeText(screen.getByLabelText('Buscar aluno'), 'an');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      fireEvent.changeText(screen.getByLabelText('Buscar aluno'), 'ana');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(399);
      });
      expect(apiState.request).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
    } finally {
      vi.useRealTimers();
    }

    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students?q=ana&limit=25&offset=0',
      expect.any(Object),
    );
    await waitFor(() => expect(screen.queryByText('Bruna Lima')).toBeNull());
    expect(screen.queryByText('Bruna Lima')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Buscar' })).toBeNull();
    const clear = screen.getByRole('button', { name: 'Limpar busca' });
    expect(
      within(screen.getByTestId('trainer-students-search-control')).getByRole('button', {
        name: 'Limpar busca',
      }),
    ).toBe(clear);
    await user.press(clear);
    expect(screen.getByLabelText('Buscar aluno').props.value).toBe('');
    expect(await screen.findByText('Bruna Lima')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Limpar busca' })).toBeNull();
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students?limit=25&offset=0',
      expect.any(Object),
    );
  });

  it('cancela a busca anterior e ignora sua resposta tardia', async () => {
    const previousSearch = deferred<{ total: number; items: TrainerStudent[] }>();
    apiState.request
      .mockResolvedValueOnce({ total: 0, items: [] })
      .mockReturnValueOnce(previousSearch.promise)
      .mockResolvedValueOnce({ total: 1, items: [studentFixture({ name: 'Bruna Lima' })] });

    renderTrainerStudents();
    await screen.findByText('Nenhum aluno vinculado');
    fireEvent.changeText(screen.getByLabelText('Buscar aluno'), 'Ana');
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    const previousSignal = apiState.request.mock.calls[1]?.[1]?.signal;
    expect(previousSignal).toBeInstanceOf(AbortSignal);
    expect(previousSignal.aborted).toBe(false);

    fireEvent.changeText(screen.getByLabelText('Buscar aluno'), 'Bruna');
    expect(previousSignal.aborted).toBe(true);
    expect(await screen.findByText('Bruna Lima')).toBeTruthy();
    await act(async () => {
      previousSearch.resolve({ total: 1, items: [studentFixture({ name: 'Ana Lima' })] });
    });
    expect(screen.queryByText('Ana Lima')).toBeNull();
    expect(screen.getByText('Bruna Lima')).toBeTruthy();
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students?q=Bruna&limit=25&offset=0',
      expect.any(Object),
    );
  });

  it('limpar antes dos 400 ms impede a busca pendente', async () => {
    apiState.request.mockResolvedValue({ total: 1, items: [studentFixture()] });
    renderTrainerStudents();
    await screen.findByText('Ana Lima');
    vi.useFakeTimers();
    try {
      fireEvent.changeText(screen.getByLabelText('Buscar aluno'), 'Carlos');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      fireEvent.press(screen.getByRole('button', { name: 'Limpar busca' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(screen.getByLabelText('Buscar aluno').props.value).toBe('');
      expect(
        apiState.request.mock.calls.every(([path]) => path === '/students?limit=25&offset=0'),
      ).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('enviar pelo teclado não duplica a busca automática', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValue({ total: 1, items: [studentFixture()] });

    renderTrainerStudents();

    await screen.findByText('Ana Lima');
    const searchField = screen.getByLabelText('Buscar aluno');
    await user.type(searchField, 'Ana');
    fireEvent(searchField, 'submitEditing');

    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students?q=Ana&limit=25&offset=0',
      expect.any(Object),
    );
    expect(apiState.request).toHaveBeenCalledTimes(2);
  });

  it('reinicia a paginação ao pesquisar e pagina os resultados da API', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ total: 3, items: [studentFixture()] })
      .mockResolvedValueOnce({
        total: 3,
        items: [studentFixture({ id: 'student-2', name: 'Bruna Lima' })],
      })
      .mockResolvedValueOnce({
        total: 2,
        items: [studentFixture({ id: 'student-3', name: 'Ana Júlia Souza' })],
      })
      .mockResolvedValueOnce({
        total: 2,
        items: [studentFixture({ id: 'student-4', name: 'Ana Júlia Lima' })],
      });

    renderTrainerStudents();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));
    expect(await screen.findByText('Bruna Lima')).toBeTruthy();
    await user.type(screen.getByLabelText('Buscar aluno'), '  Ana Júlia  ');
    expect(apiState.request).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Ana Júlia Souza')).toBeTruthy();
    expect(screen.queryByText('Bruna Lima')).toBeNull();
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students?q=Ana%20J%C3%BAlia&limit=25&offset=0',
      expect.any(Object),
    );
    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));
    expect(await screen.findByText('Ana Júlia Lima')).toBeTruthy();
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students?q=Ana%20J%C3%BAlia&limit=25&offset=1',
      expect.any(Object),
    );
  });

  it('mostra loading durante a carga inicial', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderTrainerStudents();

    expect(screen.getByText('Carregando alunos')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Alunos' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Carregando alunos' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState.disabled,
    ).toBe(true);
  });

  it('permite retry depois de erro inicial', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ total: 0, items: [] });

    renderTrainerStudents();

    expect(await screen.findByRole('header', { name: 'Alunos' })).toBeTruthy();
    expect(await screen.findByText('Não foi possível carregar seus alunos')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));
    expect(await screen.findByText('Nenhum aluno vinculado')).toBeTruthy();
  });

  it('diferencia carteira vazia de busca sem resultado e permite limpar', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ total: 1, items: [studentFixture()] })
      .mockResolvedValueOnce({ total: 0, items: [] })
      .mockResolvedValueOnce({ total: 1, items: [studentFixture()] });

    renderTrainerStudents();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();

    await user.type(screen.getByLabelText('Buscar aluno'), 'Ninguém');
    expect(await screen.findByText('Nenhum aluno encontrado')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Limpar busca' })).toHaveLength(1);
    expect(screen.getByText('0 alunos encontrados')).toBeTruthy();

    await user.press(screen.getAllByRole('button', { name: 'Limpar busca' })[0]);
    expect(await screen.findByText('Ana Lima')).toBeTruthy();
  });

  it('mantém a busca aplicada ao atualizar', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ total: 1, items: [studentFixture()] })
      .mockResolvedValueOnce({ total: 1, items: [studentFixture()] })
      .mockResolvedValueOnce({ total: 1, items: [studentFixture()] });

    renderTrainerStudents();
    await screen.findByText('Ana Lima');
    await user.type(screen.getByLabelText('Buscar aluno'), 'Ana');
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Ana Lima')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(3));
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students?q=Ana&limit=25&offset=0',
      expect.any(Object),
    );
  });

  it('preserva itens e exibe erro quando a atualização falha', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ total: 1, items: [studentFixture()] })
      .mockRejectedValueOnce(new Error('offline'));

    renderTrainerStudents();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Não foi possível atualizar a lista.')).toBeTruthy();
    expect(screen.getByText('Ana Lima')).toBeTruthy();
  });

  it('carrega a próxima página pelo offset realmente carregado', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ total: 3, items: [studentFixture()] })
      .mockResolvedValueOnce({
        total: 3,
        items: [studentFixture({ id: 'student-2', name: 'Bruna Lima' })],
      })
      .mockResolvedValueOnce({
        total: 3,
        items: [studentFixture({ id: 'student-3', name: 'Carlos Lima' })],
      });

    renderTrainerStudents();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));
    expect(await screen.findByText('Bruna Lima')).toBeTruthy();
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students?limit=25&offset=1',
      expect.any(Object),
    );

    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));
    expect(await screen.findByText('Carlos Lima')).toBeTruthy();
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students?limit=25&offset=2',
      expect.any(Object),
    );
  });

  it('bloqueia a atualização enquanto carrega a próxima página', async () => {
    const user = userEvent.setup();
    const nextPageRequest = deferred<{ total: number; items: TrainerStudent[] }>();
    apiState.request
      .mockResolvedValueOnce({ total: 2, items: [studentFixture()] })
      .mockReturnValueOnce(nextPageRequest.promise);

    renderTrainerStudents();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));

    const updateButton = screen.getByRole('button', { name: 'Atualizar' });
    expect(updateButton.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    await user.press(updateButton);
    expect(apiState.request).toHaveBeenCalledTimes(2);

    nextPageRequest.resolve({
      total: 2,
      items: [studentFixture({ id: 'student-2', name: 'Bruna Lima' })],
    });
    expect(await screen.findByText('Bruna Lima')).toBeTruthy();
  });

  it('bloqueia carregar mais enquanto atualiza a carteira', async () => {
    const user = userEvent.setup();
    const refreshRequest = deferred<{ total: number; items: TrainerStudent[] }>();
    apiState.request
      .mockResolvedValueOnce({ total: 2, items: [studentFixture()] })
      .mockReturnValueOnce(refreshRequest.promise);

    renderTrainerStudents();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));

    expect(screen.getByText('Atualizando')).toBeTruthy();
    expect(screen.getByText('Aguarde enquanto os dados são atualizados.')).toBeTruthy();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Atualizando...' })).toBeNull();

    const loadMoreButton = screen.getByRole('button', { name: 'Carregar mais' });
    expect(loadMoreButton.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    await user.press(loadMoreButton);
    expect(apiState.request).toHaveBeenCalledTimes(2);

    refreshRequest.resolve({ total: 2, items: [studentFixture()] });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false }),
      ),
    );
  });

  it('preserva itens se carregar mais falhar e permite tentar novamente', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ total: 26, items: [studentFixture()] })
      .mockRejectedValueOnce(new Error('offline'));

    renderTrainerStudents();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('Não foi possível carregar mais alunos.')).toBeTruthy();
    expect(screen.getByText('Ana Lima')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar carregar mais' })).toBeTruthy();
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students?limit=25&offset=1',
      expect.any(Object),
    );
  });

  it('bloqueia a atualização durante o retry da paginação', async () => {
    const user = userEvent.setup();
    const retryRequest = deferred<{ total: number; items: TrainerStudent[] }>();
    apiState.request
      .mockResolvedValueOnce({ total: 26, items: [studentFixture()] })
      .mockRejectedValueOnce(new Error('offline'))
      .mockReturnValueOnce(retryRequest.promise);

    renderTrainerStudents();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));
    await user.press(await screen.findByRole('button', { name: 'Tentar carregar mais' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(3));

    const loadingMoreButton = screen.getByRole('button', { name: 'Carregando mais...' });
    expect(loadingMoreButton.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    const updateButton = screen.getByRole('button', { name: 'Atualizar' });
    expect(updateButton.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(screen.queryByText('Atualizando')).toBeNull();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    await user.press(updateButton);
    expect(apiState.request).toHaveBeenCalledTimes(3);

    retryRequest.resolve({ total: 26, items: [] });
    expect(await screen.findByRole('button', { name: 'Carregar mais' })).toBeTruthy();
  });

  it('não mostra Carregar mais quando todos os itens foram carregados', async () => {
    apiState.request.mockResolvedValueOnce({ total: 1, items: [studentFixture()] });

    renderTrainerStudents();

    expect(await screen.findByText('Ana Lima')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull();
    expect(screen.getByText('1 de 1 alunos carregados')).toBeTruthy();
    expect(screen.getByText('Todos os alunos carregados')).toBeTruthy();
  });
});
