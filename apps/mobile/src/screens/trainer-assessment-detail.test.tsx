import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { createElement } from 'react';
import { StyleSheet } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Assessment } from '../application/assessments/assessment-data';
import { ApiError } from '../lib/api';
import { TrainerAssessmentDetailScreen } from './trainer-assessment-detail';

const STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_STUDENT_ID = '00000000-0000-0000-0000-000000000002';
const ASSESSMENT_ID = '00000000-0000-0000-0000-000000000011';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({ dismissTo: vi.fn() }));
const paramsState = vi.hoisted(() => ({
  studentId: '00000000-0000-0000-0000-000000000001' as string | undefined,
  assessmentId: '00000000-0000-0000-0000-000000000011' as string | undefined,
}));

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
    id: ASSESSMENT_ID,
    studentId: STUDENT_ID,
    date: '2026-09-03',
    weightKg: '82.5',
    heightCm: '178',
    bodyFatPct: '18.4',
    measurements: null,
    photos: null,
    notes: null,
    createdAt: '2026-09-03T12:00:00.000Z',
    ...overrides,
  };
}

function renderTrainerAssessmentDetail(options: { studentName?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  if (options.studentName) {
    queryClient.setQueryData(['trainer', 'student', STUDENT_ID], { name: options.studentName });
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerAssessmentDetailScreen />
    </QueryClientProvider>,
  );
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      if (!resolvePromise) {
        throw new Error('Deferred promise is not initialized.');
      }

      resolvePromise(value);
    },
  };
}

beforeEach(() => {
  apiState.request.mockReset();
  routerState.dismissTo.mockReset();
  paramsState.studentId = STUDENT_ID;
  paramsState.assessmentId = ASSESSMENT_ID;
});

describe('TrainerAssessmentDetailScreen', () => {
  it('alinha métricas e títulos ao detalhe do Pencil sem remover a atualização', async () => {
    apiState.request.mockResolvedValueOnce(assessmentFixture());

    renderTrainerAssessmentDetail();

    expect(await screen.findByText('Avaliação de 3 de setembro')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-assessment-metrics').props.style),
    ).toMatchObject({ gap: 12 });
    expect(
      StyleSheet.flatten(screen.getByTestId('trainer-assessment-summary-card-weight').props.style),
    ).toMatchObject({
      borderRadius: 8,
      minHeight: 118,
    });
    expect(
      StyleSheet.flatten(screen.getByText('Avaliação de 3 de setembro').props.style),
    ).toMatchObject({
      fontSize: 25,
      fontWeight: '700',
      lineHeight: 32,
    });
    expect(StyleSheet.flatten(screen.getByText('3 de setembro de 2026 • Aluno').props.style)).toMatchObject({
      fontSize: 13,
      lineHeight: 16,
    });
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeTruthy();
  });

  it('organiza identificação, métricas principais, notas e foto de evolução', async () => {
    apiState.request.mockResolvedValueOnce(
      assessmentFixture({
        photos: ['https://cdn.test/front.jpg'],
        notes: 'Boa evolução',
      }),
    );

    renderTrainerAssessmentDetail({ studentName: 'Mariana Costa' });

    expect(await screen.findByText('Avaliação de 3 de setembro')).toBeTruthy();
    expect(screen.getByText('3 de setembro de 2026 • Mariana Costa')).toBeTruthy();
    expect(screen.getByText('Medida atual')).toBeTruthy();
    expect(screen.getByText('Composição corporal')).toBeTruthy();
    expect(screen.getByText('Notas do acompanhamento')).toBeTruthy();
    expect(screen.getByText('Foto de evolução')).toBeTruthy();
    expect(screen.getByText('Vista frontal • registrada nesta avaliação')).toBeTruthy();
    expect(screen.getByTestId('trainer-assessment-detail-header')).toBeTruthy();
    expect(screen.getByTestId('trainer-assessment-metrics')).toBeTruthy();
    expect(screen.getByTestId('trainer-assessment-photos')).toBeTruthy();
  });

  it('não ocupa espaço com medidas quando a avaliação não as informa', async () => {
    apiState.request.mockResolvedValueOnce(assessmentFixture());

    renderTrainerAssessmentDetail();

    await screen.findByText('Avaliação de 3 de setembro');

    expect(screen.queryByText('Medidas de circunferência')).toBeNull();
    expect(screen.queryByText('Altura')).toBeNull();
  });

  it('renderiza métricas, medidas, fotos e observações', async () => {
    apiState.request.mockResolvedValueOnce(
      assessmentFixture({
        weightKg: '82.5',
        heightCm: '178',
        bodyFatPct: '18.4',
        measurements: {
          chest: 101.5,
          waist: 84,
        },
        photos: ['https://cdn.test/front.jpg', 'https://cdn.test/back.jpg'],
        notes: 'Boa evolução',
      }),
    );

    renderTrainerAssessmentDetail();

    expect(await screen.findByText('Avaliação de 3 de setembro')).toBeTruthy();
    expect(screen.getByText('82,5 kg')).toBeTruthy();
    expect(screen.queryByText('Altura')).toBeNull();
    expect(screen.queryByText('178 cm')).toBeNull();
    expect(screen.getByText('18,4%')).toBeTruthy();
    expect(screen.getByText('101,5 cm')).toBeTruthy();
    expect(screen.getByText('84 cm')).toBeTruthy();
    expect(screen.getByLabelText('Foto 1 da avaliação de 03/09/2026')).toBeTruthy();
    expect(screen.getByLabelText('Foto 2 da avaliação de 03/09/2026')).toBeTruthy();
    expect(screen.getByText('Boa evolução')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledWith(`/assessments/${ASSESSMENT_ID}`, {
      signal: expect.anything(),
    });
  });

  it('mapeia todas as medidas corporais com unidade em centímetros', async () => {
    apiState.request.mockResolvedValueOnce(
      assessmentFixture({
        measurements: {
          chest: 101.5,
          waist: 84,
          hip: 99,
          armRight: 35,
          armLeft: 34.5,
          thighRight: 58,
          thighLeft: 57.5,
          calfRight: 38,
          calfLeft: 37.5,
        },
      }),
    );

    renderTrainerAssessmentDetail();

    expect(await screen.findByText('Peito')).toBeTruthy();
    expect(screen.getByText('101,5 cm')).toBeTruthy();
    expect(screen.getByText('Cintura')).toBeTruthy();
    expect(screen.getByText('84 cm')).toBeTruthy();
    expect(screen.getByText('Quadril')).toBeTruthy();
    expect(screen.getByText('99 cm')).toBeTruthy();
    expect(screen.getByText('Braço direito')).toBeTruthy();
    expect(screen.getByText('35 cm')).toBeTruthy();
    expect(screen.getByText('Braço esquerdo')).toBeTruthy();
    expect(screen.getByText('34,5 cm')).toBeTruthy();
    expect(screen.getByText('Coxa direita')).toBeTruthy();
    expect(screen.getByText('58 cm')).toBeTruthy();
    expect(screen.getByText('Coxa esquerda')).toBeTruthy();
    expect(screen.getByText('57,5 cm')).toBeTruthy();
    expect(screen.getByText('Panturrilha direita')).toBeTruthy();
    expect(screen.getByText('38 cm')).toBeTruthy();
    expect(screen.getByText('Panturrilha esquerda')).toBeTruthy();
    expect(screen.getByText('37,5 cm')).toBeTruthy();
  });

  it('não renderiza avaliação de outro aluno no contexto da URL', async () => {
    apiState.request.mockResolvedValueOnce(assessmentFixture({ studentId: OTHER_STUDENT_ID }));

    renderTrainerAssessmentDetail();

    expect(await screen.findByText('Avaliação indisponível')).toBeTruthy();
    expect(screen.queryByText('82,5 kg')).toBeNull();
    expect(screen.getByRole('button', { name: 'Voltar para avaliações' })).toBeTruthy();
  });

  it('não expõe editar ou excluir', async () => {
    apiState.request.mockResolvedValueOnce(assessmentFixture());

    renderTrainerAssessmentDetail();

    await screen.findByText('Avaliação de 3 de setembro');
    expect(screen.queryByRole('button', { name: 'Editar avaliação' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir avaliação' })).toBeNull();
  });

  it('usa dismissTo para voltar aos alunos quando falta studentId', async () => {
    const user = userEvent.setup();
    paramsState.studentId = undefined;
    paramsState.assessmentId = undefined;

    renderTrainerAssessmentDetail();

    expect(screen.getByText('Avaliação inválida')).toBeTruthy();
    expect(screen.getByText('Não foi possível identificar a avaliação solicitada.')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Voltar para avaliações' }));

    expect(routerState.dismissTo).toHaveBeenCalledWith('/trainer/students');
  });

  it('usa dismissTo para o histórico quando falta assessmentId', async () => {
    const user = userEvent.setup();
    paramsState.assessmentId = undefined;

    renderTrainerAssessmentDetail();

    await user.press(screen.getByRole('button', { name: 'Voltar para avaliações' }));

    expect(routerState.dismissTo).toHaveBeenCalledWith(
      `/trainer/students/${STUDENT_ID}/assessments`,
    );
  });

  it('mostra loading durante a carga inicial', () => {
    apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

    renderTrainerAssessmentDetail();

    expect(screen.getByText('Carregando avaliação')).toBeTruthy();
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('mostra 404 como avaliação não encontrada sem revelar escopo', async () => {
    apiState.request.mockRejectedValueOnce(new ApiError('not found', 404));

    renderTrainerAssessmentDetail();

    expect(await screen.findByText('Avaliação não encontrada')).toBeTruthy();
    expect(screen.getByText('Esta avaliação não está disponível para sua conta.')).toBeTruthy();
    expect(screen.queryByText('not found')).toBeNull();
    expect(screen.getByRole('button', { name: 'Voltar para avaliações' })).toBeTruthy();
  });

  it('permite retry depois de erro genérico', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(assessmentFixture());

    renderTrainerAssessmentDetail();

    expect(await screen.findByText('Não foi possível carregar a avaliação')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Avaliação de 3 de setembro')).toBeTruthy();
    expect(apiState.request).toHaveBeenCalledTimes(2);
  });

  it('usa Não informado para campos nulos sem inventar valores', async () => {
    apiState.request.mockResolvedValueOnce(
      assessmentFixture({
        weightKg: null,
        heightCm: null,
        bodyFatPct: null,
        measurements: null,
        photos: null,
        notes: null,
      }),
    );

    renderTrainerAssessmentDetail();

    expect(await screen.findByText('Avaliação de 3 de setembro')).toBeTruthy();
    expect(screen.getAllByText('Não informado')).toHaveLength(3);
    expect(screen.queryByText('82,5 kg')).toBeNull();
    expect(screen.queryByText('Medidas de circunferência')).toBeNull();
    expect(screen.queryByText('Fotos')).toBeNull();
  });

  it('atualiza o conteúdo ao refazer a consulta', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce(assessmentFixture())
      .mockResolvedValueOnce(assessmentFixture({ weightKg: '80' }));

    renderTrainerAssessmentDetail();
    expect(await screen.findByText('82,5 kg')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('80 kg')).toBeTruthy();
    await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
  });

  it('preserva o conteúdo e exibe erro quando a atualização falha', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce(assessmentFixture())
      .mockRejectedValueOnce(new Error('offline'));

    renderTrainerAssessmentDetail();
    expect(await screen.findByText('82,5 kg')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Não foi possível atualizar a avaliação.')).toBeTruthy();
    expect(screen.getByText('82,5 kg')).toBeTruthy();
  });

  it('oculta o cache e mostra indisponibilidade quando a atualização retorna 404', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce(assessmentFixture())
      .mockRejectedValueOnce(new ApiError('not found', 404));

    renderTrainerAssessmentDetail();
    expect(await screen.findByText('82,5 kg')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Avaliação não encontrada')).toBeTruthy();
    expect(screen.getByText('Esta avaliação não está disponível para sua conta.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar para avaliações' })).toBeTruthy();
    expect(screen.queryByText('82,5 kg')).toBeNull();
    expect(screen.queryByText('Não foi possível atualizar a avaliação.')).toBeNull();
  });

  it('desabilita atualizar enquanto a consulta está pendente', async () => {
    const user = userEvent.setup();
    const refreshRequest = deferred<Assessment>();
    apiState.request
      .mockResolvedValueOnce(assessmentFixture())
      .mockReturnValueOnce(refreshRequest.promise);

    renderTrainerAssessmentDetail();
    expect(await screen.findByText('82,5 kg')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(screen.getByRole('button', { name: 'Atualizando...' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );

    refreshRequest.resolve(assessmentFixture({ weightKg: '81' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Atualizar' }).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false }),
      ),
    );
  });

  it('volta deterministicamente para o histórico do aluno', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce(assessmentFixture());

    renderTrainerAssessmentDetail();
    await screen.findByText('Avaliação de 3 de setembro');

    await user.press(screen.getByRole('button', { name: 'Voltar para avaliações' }));

    expect(routerState.dismissTo).toHaveBeenCalledWith(
      `/trainer/students/${STUDENT_ID}/assessments`,
    );
  });
});
