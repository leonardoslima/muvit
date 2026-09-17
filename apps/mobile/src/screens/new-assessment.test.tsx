import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import { type ReactNode, createElement } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { Card } from '../components/ui/card';
import { spacing } from '../lib/styles';
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

vi.mock('react-native', async (importOriginal) => {
  const reactNative = await importOriginal<typeof import('react-native')>();

  return {
    ...reactNative,
    KeyboardAvoidingView: ({ children, ...props }: { children?: ReactNode }) =>
      createElement('KeyboardAvoidingView', props, children),
  };
});

vi.mock('@expo/vector-icons', () => ({
  Feather: (props: { color: string; name: string; size: number; testID?: string }) =>
    createElement('Feather', props),
  Ionicons: (props: { color: string; name: string; size: number; testID?: string }) =>
    createElement('Ionicons', props),
}));

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
  it('usa shell rolável com teclado, formulário sem Card e rodapé fixo para salvar', () => {
    render(<NewAssessmentScreen />);

    const keyboardShell = screen.UNSAFE_getByType(KeyboardAvoidingView);
    expect(keyboardShell.props.behavior).toBe('padding');

    const scrollView = screen.UNSAFE_getByType(ScrollView);
    expect(within(scrollView).getByRole('button', { name: 'Adicionar foto' })).toBeTruthy();
    expect(() => within(scrollView).getByRole('button', { name: 'Salvar' })).toThrow();
    expect(screen.UNSAFE_queryByType(Card)).toBeNull();

    const footer = screen.getByTestId('new-assessment-footer');
    expect(within(footer).getByRole('button', { name: 'Salvar' })).toBeTruthy();
    expect(screen.getByTestId('save-assessment-icon').props).toMatchObject({
      name: 'save-outline',
      size: 18,
    });
  });

  it('oferece retorno acessível no cabeçalho compacto e não adiciona menu', () => {
    render(<NewAssessmentScreen />);

    const backButton = screen.getByRole('button', { name: 'Voltar' });
    expect(backButton.props.accessibilityLabel).toBe('Voltar');
    expect(backButton.props.accessibilityState).toEqual({ disabled: false });
    expect(screen.queryByLabelText('Mais opções')).toBeNull();

    fireEvent.press(backButton);
    expect(routerState.back).toHaveBeenCalledOnce();
  });

  it('mantém peso e gordura corporal na mesma linha e foto no conteúdo', () => {
    render(<NewAssessmentScreen />);

    const measurementsRow = screen.getByTestId('assessment-measurements-row');
    expect(StyleSheet.flatten(measurementsRow.props.style)).toMatchObject({
      flexDirection: 'row',
      gap: spacing.md,
    });
    expect(within(measurementsRow).getByLabelText('Peso (kg)')).toBeTruthy();
    expect(within(measurementsRow).getByLabelText('Gordura corporal (%)')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByLabelText('Notas').props.style)).toMatchObject({
      minHeight: 100,
      textAlignVertical: 'top',
    });
    expect(screen.getByText('Registre suas medidas e observações.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Observações desta avaliação')).toBeTruthy();
    expect(screen.getByTestId('add-photo-icon').props).toMatchObject({
      name: 'upload',
      size: 24,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('assessment-photo-action').props.style),
    ).toMatchObject({
      height: 112,
      borderWidth: 1.5,
      gap: spacing.sm,
    });
    expect(screen.getByTestId('assessment-photo-action')).toBeTruthy();
  });

  it('mantém o sucesso anunciado por tempo perceptível antes de voltar', async () => {
    let resolveInvalidation: () => void = () => undefined;
    apiState.request.mockResolvedValueOnce(undefined);
    queryState.invalidateQueries.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveInvalidation = resolve;
        }),
    );

    render(<NewAssessmentScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(queryState.invalidateQueries).toHaveBeenCalledOnce());

    vi.useFakeTimers();
    try {
      await act(async () => {
        resolveInvalidation();
      });

      const feedback = screen.getByTestId('inline-message');
      expect(feedback.props.accessibilityRole).toBe('alert');
      expect(feedback.props.accessibilityLiveRegion).toBe('polite');
      expect(screen.getByText('Avaliação salva!')).toBeTruthy();
      expect(routerState.back).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(999));
      expect(screen.getByText('Avaliação salva!')).toBeTruthy();
      expect(routerState.back).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(501));
      expect(routerState.back).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

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
    const events: string[] = [];
    routerState.back.mockImplementationOnce(() => {
      events.push('back');
    });
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
    await user.type(screen.getByLabelText('Peso (kg)'), '80');
    await user.type(screen.getByLabelText('Gordura corporal (%)'), '19');
    await user.type(screen.getByLabelText('Notas'), 'Evoluiu');
    await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));

    expect(await screen.findByText('Foto adicionada')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Salvar' }));

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
    events.push('success');
    expect(events).toEqual(['success']);
    await waitFor(() => expect(routerState.back).toHaveBeenCalledOnce(), { timeout: 2_000 });
    expect(events).toEqual(['success', 'back']);
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
    expect(screen.getByText('Peso (kg)')).toBeTruthy();
    expect(screen.getByText('Gordura corporal (%)')).toBeTruthy();
    expect(screen.getByText('Notas')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByRole('button', { name: 'Salvando avaliação...' })).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Salvando avaliação...' }));
    expect(apiState.request).toHaveBeenCalledTimes(1);
    expect(routerState.back).not.toHaveBeenCalled();

    resolveRequest();
    expect(await screen.findByText('Avaliação salva!')).toBeTruthy();
    await waitFor(() => expect(routerState.back).toHaveBeenCalledOnce(), { timeout: 2_000 });
  });

  it('mantém o erro visível, não volta e permite novo envio bem-sucedido', async () => {
    const user = userEvent.setup();
    apiState.request.mockRejectedValueOnce(new Error('falha'));

    render(<NewAssessmentScreen />);

    await user.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Não foi possível salvar sua avaliação.')).toBeTruthy();
    expect(routerState.back).not.toHaveBeenCalled();

    apiState.request.mockResolvedValueOnce(undefined);
    queryState.invalidateQueries.mockResolvedValueOnce(undefined);
    await user.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Avaliação salva!')).toBeTruthy();
    await waitFor(() => expect(routerState.back).toHaveBeenCalledOnce(), { timeout: 2_000 });
  });
});
