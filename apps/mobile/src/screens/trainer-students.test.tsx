import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
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

  it('só aplica a busca quando o usuário submete', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ total: 0, items: [] })
      .mockResolvedValueOnce({ total: 0, items: [] });

    renderTrainerStudents();

    await screen.findByText('Nenhum aluno vinculado');
    await user.type(screen.getByLabelText('Buscar aluno'), 'Ana Júlia');

    expect(apiState.request).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students?q=Ana%20J%C3%BAlia&limit=25&offset=0',
      expect.any(Object),
    );
  });

  it('aplica a busca ao enviar o teclado', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ total: 0, items: [] })
      .mockResolvedValueOnce({ total: 1, items: [studentFixture()] });

    renderTrainerStudents();

    await screen.findByText('Nenhum aluno vinculado');
    const searchField = screen.getByLabelText('Buscar aluno');
    await user.type(searchField, 'Ana');
    fireEvent(searchField, 'submitEditing');

    expect(await screen.findByText('Ana Lima')).toBeTruthy();
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students?q=Ana&limit=25&offset=0',
      expect.any(Object),
    );
  });

  it('mostra loading durante a carga inicial', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderTrainerStudents();

    expect(screen.getByText('Carregando alunos')).toBeTruthy();
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('permite retry depois de erro inicial', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ total: 0, items: [] });

    renderTrainerStudents();

    await user.press(await screen.findByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum aluno vinculado')).toBeTruthy();
  });

  it('diferencia carteira vazia de busca sem resultado e permite limpar', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ total: 0, items: [] })
      .mockResolvedValueOnce({ total: 0, items: [] })
      .mockResolvedValueOnce({ total: 1, items: [studentFixture()] });

    renderTrainerStudents();
    expect(await screen.findByText('Nenhum aluno vinculado')).toBeTruthy();

    await user.type(screen.getByLabelText('Buscar aluno'), 'Ninguém');
    await user.press(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByText('Nenhum aluno encontrado')).toBeTruthy();

    await user.press(screen.getAllByRole('button', { name: 'Limpar busca' })[0]);
    expect(await screen.findByText('Ana Lima')).toBeTruthy();
  });

  it('mantém a busca aplicada ao atualizar', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ total: 0, items: [] })
      .mockResolvedValueOnce({ total: 1, items: [studentFixture()] })
      .mockResolvedValueOnce({ total: 1, items: [studentFixture()] });

    renderTrainerStudents();
    await screen.findByText('Nenhum aluno vinculado');
    await user.type(screen.getByLabelText('Buscar aluno'), 'Ana');
    await user.press(screen.getByRole('button', { name: 'Buscar' }));
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

  it('não mostra Carregar mais quando todos os itens foram carregados', async () => {
    apiState.request.mockResolvedValueOnce({ total: 1, items: [studentFixture()] });

    renderTrainerStudents();

    expect(await screen.findByText('Ana Lima')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull();
  });
});
