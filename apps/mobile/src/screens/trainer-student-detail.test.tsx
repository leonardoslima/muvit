import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainerStudent } from '../application/trainer/trainer-data';
import { ApiError } from '../lib/api';
import { TrainerStudentDetailScreen } from './trainer-student-detail';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({ replace: vi.fn() }));
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

beforeEach(() => {
  apiState.request.mockReset();
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

  it('não diferencia aluno ausente de aluno fora do escopo', async () => {
    apiState.request.mockRejectedValueOnce(new ApiError('not found', 404));

    renderTrainerStudentDetail();

    expect(await screen.findByText('Aluno não encontrado')).toBeTruthy();
    expect(screen.getByText('Este aluno não está disponível para sua conta.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar para alunos' })).toBeTruthy();
  });

  it('mostra loading durante a carga inicial', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderTrainerStudentDetail();

    expect(screen.getByText('Carregando aluno')).toBeTruthy();
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('permite retry depois de erro genérico', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(studentFixture());

    renderTrainerStudentDetail();

    await user.press(await screen.findByRole('button', { name: 'Tentar novamente' }));
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

  it('volta para a carteira sem ações mutáveis ou queries posteriores', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce(studentFixture());

    renderTrainerStudentDetail();
    expect(await screen.findByText('Ana Lima')).toBeTruthy();

    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nova avaliação' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Treinos' })).toBeNull();
    expect(apiState.request).toHaveBeenCalledTimes(1);
    expect(apiState.request).toHaveBeenCalledWith('/students/student-1', expect.any(Object));

    await user.press(screen.getByRole('button', { name: 'Voltar para alunos' }));
    expect(routerState.replace).toHaveBeenCalledWith('/trainer/students');
  });

  it('não chama API quando o parâmetro da rota está ausente', () => {
    paramsState.studentId = undefined;

    renderTrainerStudentDetail();

    expect(screen.getByText('Aluno inválido')).toBeTruthy();
    expect(screen.getByText('Não foi possível identificar o aluno solicitado.')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();
  });
});
