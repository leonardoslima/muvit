import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainerStudent } from '../application/trainer/trainer-data';
import { ApiError } from '../lib/api';
import { TrainerStudentDetailScreen } from './trainer-student-detail';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({ studentId: 'student-1' as string | undefined }));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('expo-router', () => ({
  router: routerState,
  useLocalSearchParams: () => paramsState,
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

function renderTrainerStudentDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerStudentDetailScreen />
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
  routerState.replace.mockReset();
  paramsState.studentId = 'student-1';
});

describe('TrainerStudentDetailScreen', () => {
  it('renderiza os dados essenciais do aluno', async () => {
    apiState.request.mockResolvedValueOnce(
      studentFixture({
        email: 'ana@example.com',
        phone: '27999999999',
        birthDate: '1994-10-12',
        gender: 'female',
        goals: 'Ganhar força',
        restrictions: 'Evitar impacto no joelho',
        status: 'paused',
      }),
    );

    renderTrainerStudentDetail();

    expect(await screen.findByText('Ana Lima')).toBeTruthy();
    expect(screen.getByText('AL')).toBeTruthy();
    expect(screen.getByText('Pausado')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
    expect(screen.getByText('27999999999')).toBeTruthy();
    expect(screen.getByText('12/10/1994')).toBeTruthy();
    expect(screen.getByText('Feminino')).toBeTruthy();
    expect(screen.getByText('Ganhar força')).toBeTruthy();
    expect(screen.getByText('Evitar impacto no joelho')).toBeTruthy();
  });

  it('usa verde profundo no cartão de identidade', async () => {
    apiState.request.mockResolvedValueOnce(studentFixture());

    renderTrainerStudentDetail();

    await screen.findByText('Ana Lima');
    const identity = screen.getByTestId('trainer-student-identity');

    expect(identity?.props.className).toContain('bg-v2-text');
  });

  it('não acrescenta textos de apoio ausentes no handoff', async () => {
    apiState.request.mockResolvedValueOnce(studentFixture());

    renderTrainerStudentDetail();

    expect(await screen.findByText('Ana Lima')).toBeTruthy();
    expect(
      screen.queryByText('Consulte o histórico ou registre uma nova avaliação deste aluno.'),
    ).toBeNull();
    expect(screen.queryByText('Consulte ou monte a prescrição de treino deste aluno.')).toBeNull();
  });

  it('não diferencia aluno ausente de aluno fora do escopo', async () => {
    apiState.request.mockRejectedValueOnce(new ApiError('not found', 404));

    renderTrainerStudentDetail();

    expect(await screen.findByText('Aluno não encontrado')).toBeTruthy();
    expect(screen.getByText('Este aluno não está disponível para sua conta.')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Alunos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar para alunos' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState.disabled,
    ).toBe(true);
  });

  it('mostra loading durante a carga inicial', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderTrainerStudentDetail();

    expect(screen.getByText('Carregando aluno')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Alunos' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Carregando aluno' })).toBeTruthy();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it('permite retry depois de erro genérico', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(studentFixture());

    renderTrainerStudentDetail();

    expect(await screen.findByRole('header', { name: 'Alunos' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));
    expect(await screen.findByText('Ana Lima')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(2);
  });

  it('renderiza fallbacks sem inventar dados', async () => {
    apiState.request.mockResolvedValueOnce(
      studentFixture({
        email: null,
        phone: null,
        birthDate: null,
        gender: null,
        goals: null,
        restrictions: null,
      }),
    );

    renderTrainerStudentDetail();

    expect(await screen.findByText('Sem contato cadastrado')).toBeTruthy();
    expect(screen.getAllByText('Não informado')).toHaveLength(2);
    expect(screen.getByText('Sem objetivo cadastrado')).toBeTruthy();
    expect(screen.getByText('Sem restrições cadastradas')).toBeTruthy();
  });

  it('atualiza o detalhe mantendo o conteúdo', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce(studentFixture())
      .mockResolvedValueOnce(studentFixture({ status: 'paused' }));

    renderTrainerStudentDetail();
    expect(await screen.findByText('Ativo')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Pausado')).toBeTruthy();
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Ana Lima')).toBeTruthy();
  });

  it('mantém o conteúdo visível e um único progresso durante refresh', async () => {
    const user = userEvent.setup();
    const refresh = deferred<TrainerStudent>();
    apiState.request.mockResolvedValueOnce(studentFixture()).mockReturnValueOnce(refresh.promise);

    renderTrainerStudentDetail();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));

    expect(screen.getByText('Atualizando')).toBeTruthy();
    expect(screen.getByText('Ana Lima')).toBeTruthy();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState.disabled,
    ).toBe(true);

    refresh.resolve(studentFixture({ status: 'paused' }));
    expect(await screen.findByText('Pausado')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Atualizando')).toBeNull());
  });

  it('preserva o conteúdo e exibe erro quando a atualização falha', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce(studentFixture())
      .mockRejectedValueOnce(new Error('offline'));

    renderTrainerStudentDetail();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Não foi possível atualizar o aluno.')).toBeTruthy();
    expect(screen.getByText('Ana Lima')).toBeTruthy();
    expect(screen.getByText('Ativo')).toBeTruthy();
  });

  it('abre histórico e nova avaliação sem fazer query adicional', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce(studentFixture());

    renderTrainerStudentDetail();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();

    expect(screen.getByText('Avaliações')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver histórico' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nova avaliação' })).toBeTruthy();
    expect(screen.getByText('Treinos')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver treinos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Novo treino' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull();
    expect(apiState.request).toHaveBeenCalledTimes(1);
    expect(apiState.request).toHaveBeenCalledWith('/students/student-1', expect.any(Object));

    await user.press(screen.getByRole('button', { name: 'Ver treinos' }));
    expect(routerState.push).toHaveBeenCalledWith({
      pathname: '/trainer/students/[studentId]/workouts',
      params: { studentId: 'student-1' },
    });

    await user.press(screen.getByRole('button', { name: 'Novo treino' }));
    expect(routerState.push).toHaveBeenCalledWith({
      pathname: '/trainer/students/[studentId]/workouts/new',
      params: { studentId: 'student-1' },
    });

    await user.press(screen.getByRole('button', { name: 'Ver histórico' }));
    expect(routerState.push).toHaveBeenCalledWith({
      pathname: '/trainer/students/[studentId]/assessments',
      params: { studentId: 'student-1' },
    });

    await user.press(screen.getByRole('button', { name: 'Nova avaliação' }));
    expect(routerState.push).toHaveBeenCalledWith({
      pathname: '/trainer/students/[studentId]/assessments/new',
      params: { studentId: 'student-1' },
    });

    await user.press(screen.getByRole('button', { name: 'Voltar para alunos' }));
    expect(routerState.replace).toHaveBeenCalledWith('/trainer/students');
  });

  it.each(['paused', 'inactive'] as const)(
    'preserva os quatro acessos para aluno %s com nome e contato extensos',
    async (status) => {
      const name = 'Ana Júlia de Souza Campos com sobrenome extenso';
      const email = 'ana.julia.souza.campos@example.com';
      const phone = '27999999999999999999';
      const student = studentFixture({
        status,
        name,
        email,
        phone,
      });
      apiState.request.mockResolvedValueOnce(student);

      renderTrainerStudentDetail();

      expect(await screen.findByText(name)).toBeTruthy();
      expect(screen.getByText(name).props.numberOfLines).toBeUndefined();
      expect(screen.getByText(email).props.numberOfLines).toBeUndefined();
      expect(screen.getByText(phone).props.numberOfLines).toBeUndefined();
      expect(screen.getByText(status === 'paused' ? 'Pausado' : 'Inativo')).toBeTruthy();
      for (const label of ['Ver histórico', 'Nova avaliação', 'Ver treinos', 'Novo treino']) {
        expect(screen.getByRole('button', { name: label })).toBeTruthy();
      }
      expect(apiState.request).toHaveBeenCalledTimes(1);
    },
  );

  it('prioriza 404 após refresh e oculta os dados anteriores', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce(studentFixture())
      .mockRejectedValueOnce(new ApiError('not found', 404));

    renderTrainerStudentDetail();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Aluno não encontrado')).toBeTruthy();
    expect(screen.queryByText('Ana Lima')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ver histórico' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Novo treino' })).toBeNull();
    expect(screen.getByRole('header', { name: 'Alunos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar para alunos' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState.disabled,
    ).toBe(true);
  });

  it('não chama API quando o parâmetro da rota está ausente', () => {
    paramsState.studentId = undefined;

    renderTrainerStudentDetail();

    expect(screen.getByText('Aluno inválido')).toBeTruthy();
    expect(screen.getByText('Não foi possível identificar o aluno solicitado.')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Alunos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar para alunos' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState.disabled,
    ).toBe(true);
    expect(apiState.request).not.toHaveBeenCalled();
  });
});
