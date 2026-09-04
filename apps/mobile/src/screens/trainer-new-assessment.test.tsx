import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { todayIsoDate } from '../lib/date';
import { TrainerNewAssessmentScreen } from './trainer-new-assessment';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const pickerState = vi.hoisted(() => ({ launchImageLibraryAsync: vi.fn() }));
const queryState = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
const routerState = vi.hoisted(() => ({ replace: vi.fn() }));
const uploadState = vi.hoisted(() => ({ uploadAssessmentPhoto: vi.fn() }));
const paramsState = vi.hoisted(() => ({ studentId: 'student-1' as string | undefined }));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('../lib/query-client', () => ({
  queryClient: queryState,
}));

vi.mock('../lib/uploads', () => ({
  uploadAssessmentPhoto: uploadState.uploadAssessmentPhoto,
}));

vi.mock('expo-image-picker', () => pickerState);

vi.mock('expo-router', () => ({
  router: routerState,
  useLocalSearchParams: () => paramsState,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

function renderTrainerNewAssessment() {
  return render(<TrainerNewAssessmentScreen />);
}

function validPickerResult(uri: string, mimeType: 'image/jpeg' | 'image/png') {
  return {
    canceled: false,
    assets: [{ mimeType, uri }],
  };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
}

beforeEach(() => {
  apiState.request.mockReset();
  pickerState.launchImageLibraryAsync.mockReset();
  queryState.invalidateQueries.mockReset();
  routerState.replace.mockReset();
  uploadState.uploadAssessmentPhoto.mockReset();
  paramsState.studentId = 'student-1';
  queryState.invalidateQueries.mockResolvedValue(undefined);
});

describe('TrainerNewAssessmentScreen', () => {
  it('inicia com todayIsoDate e não mostra IMC sem peso e altura', () => {
    renderTrainerNewAssessment();

    expect(screen.getByLabelText('Data da avaliação').props.value).toBe(todayIsoDate());
    expect(screen.getByText('IMC')).toBeTruthy();
    expect(screen.getByText('Informe peso e altura')).toBeTruthy();
    expect(screen.queryByText('26,0')).toBeNull();
  });

  it('envia avaliação completa, sem IMC no payload, invalida caches e redireciona após feedback', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync
      .mockResolvedValueOnce(validPickerResult('file:///front.jpg', 'image/jpeg'))
      .mockResolvedValueOnce(validPickerResult('file:///back.png', 'image/png'));
    uploadState.uploadAssessmentPhoto
      .mockResolvedValueOnce('https://cdn.test/front.jpg')
      .mockResolvedValueOnce('https://cdn.test/back.png');
    apiState.request.mockResolvedValueOnce({ id: 'assessment-new' });

    renderTrainerNewAssessment();

    await user.clear(screen.getByLabelText('Data da avaliação'));
    await user.type(screen.getByLabelText('Data da avaliação'), '2026-09-03');
    await user.type(screen.getByLabelText('Peso'), '82,5');
    await user.type(screen.getByLabelText('Altura'), '178');
    await user.type(screen.getByLabelText('Gordura corporal'), '18,4');
    await user.type(screen.getByLabelText('Peito'), '101,5');
    await user.type(screen.getByLabelText('Cintura'), '84');
    await user.type(screen.getByLabelText('Quadril'), '99');
    await user.type(screen.getByLabelText('Braço direito'), '35');
    await user.type(screen.getByLabelText('Braço esquerdo'), '34,5');
    await user.type(screen.getByLabelText('Coxa direita'), '58');
    await user.type(screen.getByLabelText('Coxa esquerda'), '57,5');
    await user.type(screen.getByLabelText('Panturrilha direita'), '38');
    await user.type(screen.getByLabelText('Panturrilha esquerda'), '37,5');
    await user.type(screen.getByLabelText('Observações'), 'Boa evolução');
    expect(screen.getByText('26,0')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await user.press(screen.getByRole('button', { name: 'Adicionar outra foto' }));
    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

    await waitFor(() => {
      expect(uploadState.uploadAssessmentPhoto).toHaveBeenCalledTimes(2);
      expect(apiState.request).toHaveBeenCalledWith('/students/student-1/assessments', {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-09-03',
          weightKg: 82.5,
          heightCm: 178,
          bodyFatPct: 18.4,
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
          photos: ['https://cdn.test/front.jpg', 'https://cdn.test/back.png'],
          notes: 'Boa evolução',
        }),
      });
    });

    expect(queryState.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['trainer', 'assessments', 'student-1'],
    });
    expect(queryState.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['trainer', 'summary'],
    });
    expect(JSON.stringify(apiState.request.mock.calls)).not.toContain('bmi');
    expect(await screen.findByText('Avaliação salva!')).toBeTruthy();
    expect(routerState.replace).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(routerState.replace).toHaveBeenCalledWith('/trainer/students/student-1/assessments');
    });
  });

  it('valida antes de fazer upload ou POST', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce(
      validPickerResult('file:///front.jpg', 'image/jpeg'),
    );

    renderTrainerNewAssessment();

    await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await user.type(screen.getByLabelText('Peso'), 'abc');
    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

    expect(await screen.findByText('Peso deve ser um número válido.')).toBeTruthy();
    expect(uploadState.uploadAssessmentPhoto).not.toHaveBeenCalled();
    expect(apiState.request).not.toHaveBeenCalled();
  });

  it('valida novamente após upload e não faz POST para URL de foto inválida', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce(
      validPickerResult('file:///front.jpg', 'image/jpeg'),
    );
    uploadState.uploadAssessmentPhoto.mockResolvedValueOnce('foto-invalida');

    renderTrainerNewAssessment();

    await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

    expect(await screen.findByText('A foto informada deve ser uma URL válida.')).toBeTruthy();
    expect(uploadState.uploadAssessmentPhoto).toHaveBeenCalledTimes(1);
    expect(apiState.request).not.toHaveBeenCalled();
  });

  it('não cria avaliação quando um upload falha', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce(
      validPickerResult('file:///front.jpg', 'image/jpeg'),
    );
    uploadState.uploadAssessmentPhoto.mockRejectedValueOnce(new Error('upload'));

    renderTrainerNewAssessment();
    await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

    expect(await screen.findByText('Não foi possível enviar as fotos da avaliação.')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();
    expect(queryState.invalidateQueries).not.toHaveBeenCalled();
  });

  it('mostra estado inválido sem studentId e não faz request', () => {
    paramsState.studentId = undefined;

    renderTrainerNewAssessment();

    expect(screen.getByText('Aluno inválido')).toBeTruthy();
    expect(screen.getByText('Não foi possível identificar o aluno solicitado.')).toBeTruthy();
    expect(apiState.request).not.toHaveBeenCalled();
  });

  it('mantém as fotos quando o picker é cancelado', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync
      .mockResolvedValueOnce(validPickerResult('file:///front.jpg', 'image/jpeg'))
      .mockResolvedValueOnce({ canceled: true, assets: [] });

    renderTrainerNewAssessment();

    await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await user.press(screen.getByRole('button', { name: 'Adicionar outra foto' }));

    expect(screen.getByText('Foto 1')).toBeTruthy();
    expect(screen.queryByText('Foto 2')).toBeNull();
    expect(screen.getByRole('button', { name: 'Adicionar outra foto' })).toBeTruthy();
    expect(screen.queryByText('Selecione uma imagem JPEG ou PNG.')).toBeNull();
  });

  it('rejeita MIME não suportado sem adicionar foto', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ mimeType: 'image/gif', uri: 'file:///animation.gif' }],
    });

    renderTrainerNewAssessment();
    await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));

    expect(await screen.findByText('Selecione uma imagem JPEG ou PNG.')).toBeTruthy();
    expect(screen.queryByText('Foto 1')).toBeNull();
    expect(screen.getByRole('button', { name: 'Adicionar foto' })).toBeTruthy();
  });

  it('aceita no máximo três fotos e bloqueia a quarta tentativa', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync
      .mockResolvedValueOnce(validPickerResult('file:///one.jpg', 'image/jpeg'))
      .mockResolvedValueOnce(validPickerResult('file:///two.png', 'image/png'))
      .mockResolvedValueOnce(validPickerResult('file:///three.jpg', 'image/jpeg'));

    renderTrainerNewAssessment();

    await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await user.press(screen.getByRole('button', { name: 'Adicionar outra foto' }));
    await user.press(screen.getByRole('button', { name: 'Adicionar outra foto' }));

    expect(screen.getByText('Foto 1')).toBeTruthy();
    expect(screen.getByText('Foto 2')).toBeTruthy();
    expect(screen.getByText('Foto 3')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Adicionar outra foto' })).toBeNull();
    expect(pickerState.launchImageLibraryAsync).toHaveBeenCalledTimes(3);
  });

  it('remove a foto selecionada pelo índice acessível', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce(
      validPickerResult('file:///front.jpg', 'image/jpeg'),
    );

    renderTrainerNewAssessment();
    await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    expect(screen.getByRole('button', { name: 'Remover foto 1' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Remover foto 1' }));

    expect(screen.queryByText('Foto 1')).toBeNull();
    expect(screen.getByRole('button', { name: 'Adicionar foto' })).toBeTruthy();
  });

  it('bloqueia submit concorrente enquanto salva', async () => {
    const user = userEvent.setup();
    const request = deferred<{ id: string }>();
    apiState.request.mockReturnValueOnce(request.promise);

    renderTrainerNewAssessment();

    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));
    expect(screen.getByRole('button', { name: 'Salvando avaliação...' })).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Salvando avaliação...' }));
    expect(apiState.request).toHaveBeenCalledTimes(1);

    request.resolve({ id: 'assessment-new' });
    expect(await screen.findByText('Avaliação salva!')).toBeTruthy();
  });

  it('preserva valores e fotos quando o POST falha', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce(
      validPickerResult('file:///front.jpg', 'image/jpeg'),
    );
    uploadState.uploadAssessmentPhoto.mockResolvedValueOnce('https://cdn.test/front.jpg');
    apiState.request.mockRejectedValueOnce(new Error('request'));

    renderTrainerNewAssessment();
    await user.type(screen.getByLabelText('Peso'), '82,5');
    await user.type(screen.getByLabelText('Observações'), 'Continuar acompanhamento');
    await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

    expect(await screen.findByText('Não foi possível salvar a avaliação.')).toBeTruthy();
    expect(screen.getByLabelText('Peso').props.value).toBe('82,5');
    expect(screen.getByLabelText('Observações').props.value).toBe('Continuar acompanhamento');
    expect(screen.getByText('Foto 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salvar avaliação' })).toBeTruthy();
    expect(queryState.invalidateQueries).not.toHaveBeenCalled();
    expect(routerState.replace).not.toHaveBeenCalled();
  });
});
