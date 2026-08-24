import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
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

describe('NewAssessmentScreen', () => {
  it('mantém a ação de foto quando o seletor é cancelado', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce({
      assets: [],
      canceled: true,
    });

    render(<NewAssessmentScreen />);

    await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));

    expect(screen.getByRole('button', { name: 'Adicionar foto' })).toBeTruthy();
    expect(screen.queryByText('Foto adicionada')).toBeNull();
  });

  it('mantém a foto e o payload ao salvar uma avaliação', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg' }],
    });
    uploadState.uploadAssessmentPhoto.mockResolvedValueOnce('https://cdn.test/photo.jpg');
    apiState.request.mockResolvedValueOnce(undefined);
    queryState.invalidateQueries.mockResolvedValueOnce(undefined);

    render(<NewAssessmentScreen />);

    await user.clear(screen.getByLabelText('Data da avaliação'));
    await user.type(screen.getByLabelText('Data da avaliação'), '2026-06-12');
    await user.type(screen.getByLabelText('Peso'), '80');
    await user.type(screen.getByLabelText('Gordura corporal'), '19');
    await user.type(screen.getByLabelText('Observações'), 'Evoluiu');
    await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));

    expect(await screen.findByText('Foto adicionada')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salvar avaliação' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

    await waitFor(() => {
      expect(uploadState.uploadAssessmentPhoto).toHaveBeenCalledWith({
        api: apiState,
        photo: { uri: 'file:///photo.jpg', contentType: 'image/jpeg' },
      });
      expect(apiState.request).toHaveBeenCalledWith('/students/me/assessments', {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-06-12',
          weightKg: 80,
          bodyFatPct: 19,
          photos: ['https://cdn.test/photo.jpg'],
          notes: 'Evoluiu',
        }),
      });
      expect(queryState.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['assessments', 'me'],
      });
    });

    expect(await screen.findByText('Avaliação salva!')).toBeTruthy();
    await waitFor(() => expect(routerState.back).toHaveBeenCalledOnce());
  });

  it('expõe labels visíveis e bloqueia o segundo toque durante o envio', async () => {
    const user = userEvent.setup();
    let resolveRequest: () => void = () => undefined;
    apiState.request.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    queryState.invalidateQueries.mockResolvedValueOnce(undefined);

    render(<NewAssessmentScreen />);

    expect(screen.getByText('Data da avaliação')).toBeTruthy();
    expect(screen.getByText('Peso')).toBeTruthy();
    expect(screen.getByText('Gordura corporal')).toBeTruthy();
    expect(screen.getByText('Observações')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

    expect(screen.getByRole('button', { name: 'Salvando avaliação...' })).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Salvando avaliação...' }));
    expect(apiState.request).toHaveBeenCalledTimes(1);
    expect(routerState.back).not.toHaveBeenCalled();

    resolveRequest();
    expect(await screen.findByText('Avaliação salva!')).toBeTruthy();
    await waitFor(() => expect(routerState.back).toHaveBeenCalledOnce());
  });

  it('mantém o erro visível, não volta e permite novo envio bem-sucedido', async () => {
    const user = userEvent.setup();
    apiState.request.mockRejectedValueOnce(new Error('falha'));

    render(<NewAssessmentScreen />);

    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

    expect(await screen.findByText('Não foi possível salvar sua avaliação.')).toBeTruthy();
    expect(routerState.back).not.toHaveBeenCalled();

    apiState.request.mockResolvedValueOnce(undefined);
    queryState.invalidateQueries.mockResolvedValueOnce(undefined);
    await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

    expect(await screen.findByText('Avaliação salva!')).toBeTruthy();
    await waitFor(() => expect(routerState.back).toHaveBeenCalledOnce());
  });
});
