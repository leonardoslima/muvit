import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { createElement } from 'react';
import { StyleSheet } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Assessment, AssessmentsPage } from '../application/assessments/assessment-data';
import { ApiError } from '../lib/api';
import { colors } from '../lib/styles';
import { TrainerAssessmentsScreen } from './trainer-assessments';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({
  dismissTo: vi.fn(),
  push: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({ studentId: 'student-1' as string | undefined }));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: Record<string, unknown>) => createElement('Ionicons', props),
}));

vi.mock('expo-router', () => ({
  router: routerState,
  useLocalSearchParams: () => paramsState,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

function assessmentFixture(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: 'assessment-1',
    studentId: 'student-1',
    date: '2026-09-03',
    weightKg: '82.5',
    heightCm: null,
    bodyFatPct: '18.4',
    measurements: null,
    photos: null,
    notes: 'Boa evolução',
    createdAt: '2026-09-03T12:00:00.000Z',
    ...overrides,
  };
}

function renderTrainerAssessments(options: { studentName?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  if (options.studentName) {
    queryClient.setQueryData(['trainer', 'student', 'student-1'], { name: options.studentName });
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerAssessmentsScreen />
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
  routerState.dismissTo.mockReset();
  routerState.push.mockReset();
  paramsState.studentId = 'student-1';
});

describe('TrainerAssessmentsScreen', () => {
  it('mantém o espaçamento compacto entre os cards do histórico', async () => {
    apiState.request.mockResolvedValueOnce({
      items: [assessmentFixture(), assessmentFixture({ id: 'assessment-2' })],
      total: 2,
    });

    renderTrainerAssessments();

    const list = await screen.findByTestId('trainer-assessments-list');

    expect(StyleSheet.flatten(list.props.style)).toMatchObject({ gap: 12 });
  });

  it('mostra o aluno em cache e o histórico em ordem cronológica', async () => {
    apiState.request.mockResolvedValueOnce({ items: [assessmentFixture()], total: 1 });

    renderTrainerAssessments({ studentName: 'Mariana Costa' });

    expect(await screen.findByText('Mariana Costa')).toBeTruthy();
    expect(screen.getByText('Histórico de Mariana Costa em ordem cronológica.')).toBeTruthy();
    expect(screen.getByText('Avaliação de 3 de setembro')).toBeTruthy();
    expect(screen.getByText('3 set 2026')).toBeTruthy();
    expect(screen.getByText('82,5 kg')).toBeTruthy();
    expect(screen.getByText(/Boa evolução/)).toBeTruthy();
  });

  it('mantém a navegação compacta no cabeçalho da lista', async () => {
    apiState.request.mockResolvedValueOnce({ items: [assessmentFixture()], total: 1 });

    renderTrainerAssessments({ studentName: 'Mariana Costa' });

    expect(await screen.findByTestId('trainer-assessments-header')).toBeTruthy();
    expect(screen.getByTestId('trainer-assessments-refresh')).toBeTruthy();
    expect(screen.getByTestId('trainer-assessments-refresh').props.children.props).toEqual(
      expect.objectContaining({ color: colors.muted, name: 'refresh-outline', size: 20 }),
    );
  });

  it('carrega a primeira página e abre uma avaliação', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce({
      items: [assessmentFixture()],
      total: 1,
    });

    renderTrainerAssessments();

    expect(await screen.findByText('3 set 2026')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledWith(
      '/students/student-1/assessments?limit=25&offset=0',
      expect.any(Object),
    );
    await user.press(
      screen.getByRole('button', {
        name: 'Abrir avaliação de 03/09/2026, peso: 82,5 kg, gordura corporal: 18,4%, observações: Boa evolução',
      }),
    );

    expect(routerState.push).toHaveBeenCalledWith({
      pathname: '/trainer/students/[studentId]/assessments/[assessmentId]',
      params: {
        studentId: 'student-1',
        assessmentId: 'assessment-1',
      },
    });
  });

  it('mostra vazio sem CTA de criação', async () => {
    apiState.request.mockResolvedValueOnce({ items: [], total: 0 });

    renderTrainerAssessments();

    expect(await screen.findByText('Nenhuma avaliação registrada.')).toBeTruthy();
    expect(
      screen.queryByText('Consulte o histórico de medidas e avaliações deste aluno.'),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nova avaliação' })).toBeNull();
  });

  it('mantém o estado vazio sem CTA adicional e usa ícone de avaliações', async () => {
    apiState.request.mockResolvedValueOnce({ items: [], total: 0 });

    renderTrainerAssessments();

    await screen.findByText('Nenhuma avaliação registrada.');

    expect(screen.queryByRole('button', { name: 'Nova avaliação' })).toBeNull();
    expect(screen.getByTestId('trainer-assessments-empty-icon').props.children.props).toEqual(
      expect.objectContaining({
        color: '#3498DB',
        name: 'clipboard-outline',
        size: 24,
      }),
    );
  });

  it('carrega mais sem perder a primeira página', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({
        items: Array.from({ length: 25 }, (_, index) =>
          assessmentFixture({ id: `assessment-${index + 1}` }),
        ),
        total: 26,
      })
      .mockResolvedValueOnce({
        items: [assessmentFixture({ id: 'assessment-26', date: '2026-08-01' })],
        total: 26,
      });

    renderTrainerAssessments();
    await screen.findByRole('button', { name: 'Carregar mais' });
    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('1 ago 2026')).toBeTruthy();
    expect(screen.getAllByText('3 set 2026')).toHaveLength(25);
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students/student-1/assessments?limit=25&offset=25',
      expect.any(Object),
    );
  });

  it('calcula o próximo offset pela soma dos itens acumulados', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({
        items: [assessmentFixture(), assessmentFixture({ id: 'assessment-2' })],
        total: 3,
      })
      .mockResolvedValueOnce({
        items: [assessmentFixture({ id: 'assessment-3', date: '2026-08-01' })],
        total: 3,
      });

    renderTrainerAssessments();
    await screen.findByRole('button', { name: 'Carregar mais' });
    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('1 ago 2026')).toBeTruthy();
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students/student-1/assessments?limit=25&offset=2',
      expect.any(Object),
    );
  });

  it('mostra aluno inválido e usa dismissTo para o fallback sem fazer request', async () => {
    const user = userEvent.setup();
    paramsState.studentId = undefined;

    renderTrainerAssessments();

    expect(screen.getByText('Aluno inválido')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Voltar para alunos' }));

    expect(routerState.dismissTo).toHaveBeenCalledWith('/trainer/students');
  });

  it('mostra loading durante a carga inicial', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderTrainerAssessments();

    expect(screen.getByText('Carregando avaliações')).toBeTruthy();
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('permite retry depois de erro inicial', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [], total: 0 });

    renderTrainerAssessments();

    expect(await screen.findByText('Não foi possível carregar as avaliações.')).toBeTruthy();
    expect(screen.getByTestId('trainer-assessments-error-icon').props.children.props).toEqual(
      expect.objectContaining({
        color: '#3498DB',
        name: 'cloud-offline-outline',
        size: 24,
      }),
    );
    expect(screen.getByTestId('trainer-assessments-error-retry-icon')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Nenhuma avaliação registrada.')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(2);
  });

  it('preserva itens e exibe erro quando a atualização falha', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [assessmentFixture()], total: 1 })
      .mockRejectedValueOnce(new Error('offline'));

    renderTrainerAssessments();
    expect(await screen.findByText('3 set 2026')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Não foi possível atualizar as avaliações.')).toBeTruthy();
    expect(screen.getByText('3 set 2026')).toBeTruthy();
  });

  it('oculta o cache e mostra indisponibilidade quando a atualização retorna 404', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [assessmentFixture()], total: 1 })
      .mockRejectedValueOnce(new ApiError('not found', 404));

    renderTrainerAssessments();
    expect(await screen.findByText('3 set 2026')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Avaliações não encontradas')).toBeTruthy();
    expect(screen.getByText('Estas avaliações não estão disponíveis para sua conta.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar para aluno' })).toBeTruthy();
    expect(screen.queryByText('3 set 2026')).toBeNull();
    expect(screen.queryByText('Não foi possível atualizar as avaliações.')).toBeNull();
  });

  it('oculta o cache e mostra indisponibilidade quando carregar mais retorna 404', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [assessmentFixture()], total: 2 })
      .mockRejectedValueOnce(new ApiError('not found', 404));

    renderTrainerAssessments();
    expect(await screen.findByText('3 set 2026')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('Avaliações não encontradas')).toBeTruthy();
    expect(screen.getByText('Estas avaliações não estão disponíveis para sua conta.')).toBeTruthy();
    expect(screen.queryByText('3 set 2026')).toBeNull();
    expect(screen.queryByText('Não foi possível carregar mais avaliações.')).toBeNull();
  });

  it('mantém itens quando carregar mais falha e permite tentar novamente', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [assessmentFixture()], total: 2 })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        items: [assessmentFixture({ id: 'assessment-2', date: '2026-08-01' })],
        total: 2,
      });

    renderTrainerAssessments();
    expect(await screen.findByText('3 set 2026')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('Não foi possível carregar mais avaliações.')).toBeTruthy();
    expect(screen.getByText('3 set 2026')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar carregar mais' }));

    expect(await screen.findByText('1 ago 2026')).toBeTruthy();
    expect(apiState.request).toHaveBeenLastCalledWith(
      '/students/student-1/assessments?limit=25&offset=1',
      expect.any(Object),
    );
  });

  it('mostra atualização e bloqueia ações enquanto refaz a consulta', async () => {
    const user = userEvent.setup();
    const refreshRequest = deferred<AssessmentsPage>();
    apiState.request
      .mockResolvedValueOnce({ items: [assessmentFixture()], total: 2 })
      .mockReturnValueOnce(refreshRequest.promise);

    renderTrainerAssessments();
    expect(await screen.findByText('3 set 2026')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));

    expect(screen.getByRole('button', { name: 'Atualizando...' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(screen.getByRole('button', { name: 'Carregar mais' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );

    await act(async () => {
      refreshRequest.resolve({ items: [assessmentFixture()], total: 2 });
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false }),
      ),
    );
  });

  it('volta deterministically para o detalhe do aluno', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce({ items: [], total: 0 });

    renderTrainerAssessments();
    await screen.findByText('Nenhuma avaliação registrada.');

    await user.press(screen.getByRole('button', { name: 'Voltar para aluno' }));

    expect(routerState.dismissTo).toHaveBeenCalledWith('/trainer/students/student-1');
  });
});
