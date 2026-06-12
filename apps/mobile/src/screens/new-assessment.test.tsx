import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { NewAssessmentScreen } from './new-assessment';

const routerState = vi.hoisted(() => ({ back: vi.fn() }));
const authState = vi.hoisted(() => ({ userId: 'student-id' }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const queryState = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
const pickerState = vi.hoisted(() => ({ launchImageLibraryAsync: vi.fn() }));

vi.mock('expo-router', () => ({
  router: routerState,
}));

vi.mock('expo-image-picker', () => pickerState);

vi.mock('../lib/auth-store', () => ({
  useAuth: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('../lib/query-client', () => ({
  queryClient: queryState,
}));

vi.mock('../lib/uploads', () => ({
  uploadAssessmentPhoto: vi.fn().mockResolvedValue('https://cdn.test/photo.jpg'),
}));

describe('NewAssessmentScreen', () => {
  it('keeps the photo action unchanged when picker is canceled', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce({
      assets: [],
      canceled: true,
    });

    render(<NewAssessmentScreen />);

    await user.press(screen.getByText('Adicionar foto'));

    expect(screen.getByText('Adicionar foto')).toBeTruthy();
    expect(screen.queryByText('Foto selecionada')).toBeNull();
  });

  it('selects a supported photo and submits assessment', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg' }],
    });
    apiState.request.mockResolvedValueOnce(undefined);
    queryState.invalidateQueries.mockResolvedValueOnce(undefined);

    render(<NewAssessmentScreen />);

    await user.type(screen.getByPlaceholderText('Peso (kg)'), '80');
    await user.type(screen.getByPlaceholderText('Gordura corporal (%)'), '19');
    await user.type(screen.getByPlaceholderText('Notas'), 'Evoluiu');
    await user.press(screen.getByText('Adicionar foto'));

    expect(await screen.findByText('Foto selecionada')).toBeTruthy();

    await user.press(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(apiState.request).toHaveBeenCalledWith(
        '/students/student-id/assessments',
        expect.any(Object),
      );
      expect(queryState.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['assessments', 'student-id'],
      });
      expect(routerState.back).toHaveBeenCalledOnce();
    });
  });
});
