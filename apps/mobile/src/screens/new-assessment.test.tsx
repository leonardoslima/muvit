import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { KeyboardAvoidingView, Modal, ScrollView } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewAssessmentScreen } from './new-assessment';

const routerState = vi.hoisted(() => ({ back: vi.fn() }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const queryState = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
const pickerState = vi.hoisted(() => ({ launchImageLibraryAsync: vi.fn() }));
const uploadState = vi.hoisted(() => ({ uploadAssessmentPhoto: vi.fn() }));

vi.mock('expo-router', () => ({
  router: routerState,
}));

vi.mock('expo-image-picker', () => pickerState);

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

vi.mock('../lib/query-client', () => ({
  queryClient: queryState,
}));

vi.mock('../lib/uploads', () => ({
  uploadAssessmentPhoto: uploadState.uploadAssessmentPhoto,
}));

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve(value: T) {
      resolvePromise?.(value);
    },
  };
}

function pickerResult(uris: readonly string[]) {
  return {
    canceled: false,
    assets: uris.map((uri) => ({ uri, mimeType: 'image/jpeg' })),
  };
}

beforeEach(() => {
  routerState.back.mockReset();
  apiState.request.mockReset().mockResolvedValue(undefined);
  queryState.invalidateQueries.mockReset().mockResolvedValue(undefined);
  pickerState.launchImageLibraryAsync.mockReset();
  uploadState.uploadAssessmentPhoto.mockReset();
});

describe('NewAssessmentScreen', () => {
  it('mantém a seleção anterior quando a biblioteca é cancelada', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync
      .mockResolvedValueOnce(pickerResult(['file:///kept.jpg']))
      .mockResolvedValueOnce({ assets: [], canceled: true });

    render(<NewAssessmentScreen />);

    expect(screen.getByLabelText('Data da avaliação').props.value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);

    const addButton = screen.getByRole('button', { name: 'Adicionar fotos' });
    await user.press(addButton);
    await user.press(screen.getByRole('button', { name: 'Adicionar fotos' }));

    expect(screen.getByText('Foto 1')).toBeTruthy();
    expect(screen.queryByText('Foto 2')).toBeNull();
    expect(
      screen.queryByText('Não foi possível abrir a biblioteca de fotos. Tente novamente.'),
    ).toBeNull();
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('padding');
    expect(screen.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('mantém fotos e ordem no payload de nove imagens e mostra feedback antes de voltar', async () => {
    const user = userEvent.setup();
    const firstSelection = Array.from(
      { length: 8 },
      (_, index) => `file:///photo-${index + 1}.jpg`,
    );
    pickerState.launchImageLibraryAsync
      .mockResolvedValueOnce(pickerResult(firstSelection))
      .mockResolvedValueOnce(pickerResult(['file:///photo-9.jpg']));
    for (let index = 1; index <= 9; index += 1) {
      uploadState.uploadAssessmentPhoto.mockResolvedValueOnce(
        `https://cdn.test/photo-${index}.jpg`,
      );
    }

    render(<NewAssessmentScreen />);

    await user.clear(screen.getByLabelText('Data da avaliação'));
    await user.type(screen.getByLabelText('Data da avaliação'), '12/06/2026');
    expect(screen.getByLabelText('Data da avaliação')).toHaveProp('value', '12/06/2026');
    expect(screen.getByPlaceholderText('DD/MM/AAAA')).toBeTruthy();
    await user.type(screen.getByLabelText('Peso'), '80,5');
    await user.type(screen.getByLabelText('Gordura corporal'), '19,2');
    await user.type(screen.getByLabelText('Observações'), 'Evoluiu');
    await user.press(screen.getByRole('button', { name: 'Adicionar fotos' }));
    await user.press(screen.getByRole('button', { name: 'Adicionar fotos' }));

    expect(screen.getByText('Foto 1')).toBeTruthy();
    expect(screen.getByText('Foto 9')).toBeTruthy();
    expect(pickerState.launchImageLibraryAsync).toHaveBeenNthCalledWith(1, {
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 0,
      allowsEditing: false,
      quality: 0.7,
    });

    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

    await waitFor(() => {
      expect(uploadState.uploadAssessmentPhoto).toHaveBeenCalledTimes(9);
      expect(apiState.request).toHaveBeenCalledWith('/students/me/assessments', {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-06-12',
          weightKg: 80.5,
          bodyFatPct: 19.2,
          photos: Array.from(
            { length: 9 },
            (_, index) => `https://cdn.test/photo-${index + 1}.jpg`,
          ),
          notes: 'Evoluiu',
        }),
      });
      expect(queryState.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['assessments', 'me'],
      });
    });

    expect(await screen.findByText('Avaliação salva!')).toBeTruthy();
    expect(routerState.back).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Salvar avaliação' }).props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Adicionar fotos' }).props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Remover foto 1' }).props.accessibilityState.disabled,
    ).toBe(true);
    await waitFor(() => expect(routerState.back).toHaveBeenCalledOnce());
  });

  it('abre e fecha a conferência sem perder campos ou seleção', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce(
      pickerResult(['file:///front.jpg', 'file:///side.jpg']),
    );
    render(<NewAssessmentScreen />);

    await user.type(screen.getByLabelText('Peso'), '78,5');
    await user.press(screen.getByRole('button', { name: 'Adicionar fotos' }));
    await user.press(screen.getByRole('button', { name: 'Abrir foto 2' }));

    expect(screen.getByRole('header', { name: 'Foto 2 de 2' })).toBeTruthy();
    act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());

    expect(screen.queryByRole('header', { name: 'Foto 2 de 2' })).toBeNull();
    expect(screen.getByLabelText('Peso').props.value).toBe('78,5');
    expect(screen.getByText('Foto 1')).toBeTruthy();
    expect(screen.getByText('Foto 2')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Abrir foto 1' }));
    await user.press(screen.getByRole('button', { name: 'Fechar fotos' }));
    expect(screen.queryByRole('header', { name: 'Foto 1 de 2' })).toBeNull();
  });

  it('mantém campos editáveis no envio e envia o snapshot iniciado', async () => {
    const user = userEvent.setup();
    const pendingRequest = deferred<void>();
    apiState.request.mockReturnValueOnce(pendingRequest.promise);
    render(<NewAssessmentScreen />);

    await user.type(screen.getByLabelText('Peso'), '80,5');
    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

    const saveButton = screen.getByRole('button', { name: 'Salvando avaliação...' });
    expect(saveButton.props.accessibilityState.disabled).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Adicionar fotos' }).props.accessibilityState.disabled,
    ).toBe(true);
    expect(screen.getByLabelText('Peso').props.editable).toBe(true);
    await user.type(screen.getByLabelText('Peso'), ',2');
    expect(screen.getByLabelText('Peso').props.value).toBe('80,5,2');
    expect(apiState.request).toHaveBeenCalledTimes(1);
    const [, request] = apiState.request.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(request.body as string)).toMatchObject({ weightKg: 80.5 });

    pendingRequest.resolve(undefined);
    expect(await screen.findByText('Avaliação salva!')).toBeTruthy();
  });

  it('preserva campos e fotos após falha do POST e habilita nova tentativa', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce(pickerResult(['file:///front.jpg']));
    uploadState.uploadAssessmentPhoto.mockResolvedValueOnce('https://cdn.test/front.jpg');
    apiState.request.mockRejectedValueOnce(new Error('falha'));
    render(<NewAssessmentScreen />);

    await user.type(screen.getByLabelText('Peso'), '80');
    await user.type(screen.getByLabelText('Observações'), 'Continuar acompanhamento');
    await user.press(screen.getByRole('button', { name: 'Adicionar fotos' }));
    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

    expect(await screen.findByText('Não foi possível salvar sua avaliação.')).toBeTruthy();
    expect(screen.getByLabelText('Peso').props.value).toBe('80');
    expect(screen.getByLabelText('Observações').props.value).toBe('Continuar acompanhamento');
    expect(screen.getByText('Foto 1')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Salvar avaliação' }).props.accessibilityState.disabled,
    ).toBe(false);
    expect(routerState.back).not.toHaveBeenCalled();

    apiState.request.mockResolvedValueOnce(undefined);
    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));
    expect(await screen.findByText('Avaliação salva!')).toBeTruthy();
  });
});
