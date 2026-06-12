import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { ProfileScreen } from './profile';

const routerState = vi.hoisted(() => ({ replace: vi.fn() }));
const authState = vi.hoisted(() => ({ clear: vi.fn() }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('../lib/auth-store', () => ({
  useAuth: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('expo-router', () => ({
  router: routerState,
}));

function renderWithQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileScreen />
    </QueryClientProvider>,
  );
}

describe('ProfileScreen', () => {
  it('renders profile data and logs out', async () => {
    const user = userEvent.setup();
    authState.clear.mockResolvedValueOnce(undefined);
    apiState.request.mockResolvedValueOnce({
      id: 'student-id',
      name: 'Ana Aluna',
      email: 'ana@example.com',
      role: 'student',
    });

    renderWithQueryClient();

    expect(await screen.findByText('Ana Aluna')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();

    await user.press(screen.getByText('Sair'));

    await waitFor(() => {
      expect(authState.clear).toHaveBeenCalledOnce();
      expect(routerState.replace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('renders fallback values when profile data is unavailable', async () => {
    apiState.request.mockResolvedValueOnce({});

    renderWithQueryClient();

    expect(await screen.findByText('Aluno')).toBeTruthy();
    expect(screen.getByText('Sem email cadastrado')).toBeTruthy();
  });
});
