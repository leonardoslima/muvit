import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../../../test/render-with-toast';
import { useWorkoutGoal } from '../../lib/use-workout-goal';
import { StudentWorkoutGoal } from './student-workout-goal';

const state = vi.hoisted(() => ({
  owner: 'aluno-a',
  request: vi.fn(),
  bindCurrentSession: vi.fn(),
}));

vi.mock('../../lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: { user: { id: state.owner } } }) },
}));
vi.mock('../../lib/use-api', () => ({
  useApiClient: () => ({ bindCurrentSession: state.bindCurrentSession }),
}));

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, Wrapper };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolvePromise: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return { promise, resolve: resolvePromise };
}

describe('StudentWorkoutGoal com hook e cache reais', () => {
  beforeEach(() => {
    state.owner = 'aluno-a';
    state.request.mockReset().mockResolvedValue({ weeklyGoal: null });
    state.bindCurrentSession.mockReset().mockImplementation(() => ({ request: state.request }));
  });

  it('configura a meta e atualiza o cache e o resumo do mesmo aluno', async () => {
    const { client, Wrapper } = setup();
    client.setQueryData(['workout-evolution', 'aluno-a', '2026-10-17'], { weeklyGoal: null });
    client.setQueryData(['workout-evolution', 'aluno-b', '2026-10-17'], { weeklyGoal: 2 });
    render(<StudentWorkoutGoal />, { wrapper: Wrapper });
    await screen.findByLabelText('Treinos por semana');
    state.request.mockResolvedValueOnce({ weeklyGoal: 4 });
    fireEvent.changeText(screen.getByLabelText('Treinos por semana'), '4');
    fireEvent.press(screen.getByRole('button', { name: 'Salvar meta' }));
    await screen.findByText('Meta semanal atualizada.');
    expect(screen.getByLabelText('Treinos por semana').props.value).toBe('4');
    expect(client.getQueryData(['workout-goal', 'aluno-a'])).toEqual({ weeklyGoal: 4 });
    expect(
      client.getQueryState(['workout-evolution', 'aluno-a', '2026-10-17'])?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(['workout-evolution', 'aluno-b', '2026-10-17'])?.isInvalidated,
    ).toBe(false);
    expect(state.request).toHaveBeenLastCalledWith('/students/me/workout-goal', {
      method: 'PATCH',
      body: JSON.stringify({ weeklyGoal: 4 }),
    });
  });

  it('remove a meta explicitamente e volta ao campo vazio', async () => {
    state.request.mockResolvedValueOnce({ weeklyGoal: 3 });
    const { Wrapper } = setup();
    render(<StudentWorkoutGoal />, { wrapper: Wrapper });
    await screen.findByRole('button', { name: 'Remover meta' });
    fireEvent.press(screen.getByRole('button', { name: 'Remover meta' }));
    await screen.findByText('Meta semanal atualizada.');
    expect(screen.getByLabelText('Treinos por semana').props.value).toBe('');
    expect(screen.queryByRole('button', { name: 'Remover meta' })).toBeNull();
    expect(state.request).toHaveBeenLastCalledWith('/students/me/workout-goal', {
      method: 'PATCH',
      body: JSON.stringify({ weeklyGoal: null }),
    });
  });

  it('preserva a edição após erro e permite salvar novamente', async () => {
    const { Wrapper } = setup();
    render(<StudentWorkoutGoal />, { wrapper: Wrapper });
    await screen.findByLabelText('Treinos por semana');
    state.request.mockRejectedValueOnce(new Error('offline'));
    fireEvent.changeText(screen.getByLabelText('Treinos por semana'), '5');
    fireEvent.press(screen.getByRole('button', { name: 'Salvar meta' }));
    await screen.findByText('Não foi possível salvar sua meta. Tente novamente.');
    expect(screen.getByLabelText('Treinos por semana').props.value).toBe('5');
    state.request.mockResolvedValueOnce({ weeklyGoal: 5 });
    fireEvent.press(screen.getByRole('button', { name: 'Salvar meta' }));
    await screen.findByText('Meta semanal atualizada.');
    expect(screen.getByLabelText('Treinos por semana').props.value).toBe('5');
  });

  it.each(['0', '8'])('bloqueia meta fora dos limites: %s', async (value: string) => {
    const { Wrapper } = setup();
    render(<StudentWorkoutGoal />, { wrapper: Wrapper });
    await screen.findByLabelText('Treinos por semana');
    fireEvent.changeText(screen.getByLabelText('Treinos por semana'), value);
    expect(screen.getByText('Informe uma meta entre 1 e 7 treinos.')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Salvar meta' }).props.accessibilityState.disabled,
    ).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Salvar meta' }));
    expect(state.request).toHaveBeenCalledTimes(1);
  });

  it('permite repetir a consulta após erro de carregamento', async () => {
    state.request.mockRejectedValueOnce(new Error('offline'));
    const { Wrapper } = setup();
    render(<StudentWorkoutGoal />, { wrapper: Wrapper });
    await screen.findByText('Não foi possível carregar sua meta.');
    fireEvent.press(screen.getByRole('button', { name: 'Tentar carregar meta novamente' }));
    await screen.findByLabelText('Treinos por semana');
    expect(state.request).toHaveBeenCalledTimes(2);
  });

  it('preserva a meta confirmada quando uma leitura antiga termina após o salvamento', async () => {
    state.request.mockResolvedValueOnce({ weeklyGoal: 2 });
    const { client, Wrapper } = setup();
    const pendingRead = deferred<{ weeklyGoal: number }>();
    const { result } = renderHook(() => useWorkoutGoal(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.query.data).toEqual({ weeklyGoal: 2 }));

    state.request.mockReturnValueOnce(pendingRead.promise);
    let refetching: Promise<unknown> | undefined;
    act(() => {
      refetching = result.current.query.refetch();
    });
    await waitFor(() =>
      expect(client.getQueryState(['workout-goal', 'aluno-a'])?.fetchStatus).toBe('fetching'),
    );
    state.request.mockResolvedValueOnce({ weeklyGoal: 5 });
    await act(async () => {
      await result.current.save(5);
    });
    expect(client.getQueryData(['workout-goal', 'aluno-a'])).toEqual({ weeklyGoal: 5 });

    await act(async () => {
      pendingRead.resolve({ weeklyGoal: 2 });
      await refetching;
    });
    await waitFor(() =>
      expect(client.getQueryState(['workout-goal', 'aluno-a'])?.fetchStatus).toBe('idle'),
    );
    await waitFor(() => expect(result.current.query.data).toEqual({ weeklyGoal: 5 }));
    expect(client.getQueryData(['workout-goal', 'aluno-a'])).toEqual({ weeklyGoal: 5 });
  });

  it('confirma o salvamento sem aguardar uma atualização lenta da evolução', async () => {
    const { Wrapper } = setup();
    const pendingEvolution = deferred<{ weeklyGoal: number | null }>();
    const evolutionRequest = vi
      .fn()
      .mockResolvedValueOnce({ weeklyGoal: null })
      .mockReturnValue(pendingEvolution.promise);
    function EvolutionSubscriber() {
      useQuery({
        queryKey: ['workout-evolution', 'aluno-a', '2026-10-17'],
        queryFn: evolutionRequest,
      });
      return null;
    }
    render(
      <>
        <EvolutionSubscriber />
        <StudentWorkoutGoal />
      </>,
      { wrapper: Wrapper },
    );
    await screen.findByLabelText('Treinos por semana');
    await waitFor(() => expect(evolutionRequest).toHaveBeenCalledTimes(1));
    state.request.mockResolvedValueOnce({ weeklyGoal: 4 });
    fireEvent.changeText(screen.getByLabelText('Treinos por semana'), '4');
    fireEvent.press(screen.getByRole('button', { name: 'Salvar meta' }));
    await waitFor(() => expect(evolutionRequest).toHaveBeenCalledTimes(2));
    try {
      await screen.findByText('Meta semanal atualizada.');
      expect(screen.getByLabelText('Treinos por semana').props.editable).not.toBe(false);
      expect(
        screen.getByRole('button', { name: 'Remover meta' }).props.accessibilityState.disabled,
      ).toBe(false);
    } finally {
      await act(async () => {
        pendingEvolution.resolve({ weeklyGoal: 4 });
      });
    }
  });

  it('mantém resposta tardia da mutação no cache do proprietário original', async () => {
    const { client, Wrapper } = setup();
    const pending = deferred<{ weeklyGoal: number }>();
    const { result, rerender } = renderHook(() => useWorkoutGoal(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    state.request.mockReturnValueOnce(pending.promise);
    let saving: Promise<unknown> | undefined;
    act(() => {
      saving = result.current.save(4);
    });
    await waitFor(() => expect(state.request).toHaveBeenCalledTimes(2));
    state.owner = 'aluno-b';
    state.request.mockResolvedValueOnce({ weeklyGoal: 2 });
    rerender({});
    await waitFor(() => expect(result.current.query.data).toEqual({ weeklyGoal: 2 }));
    await act(async () => {
      pending.resolve({ weeklyGoal: 4 });
      await saving;
    });
    expect(result.current.query.data).toEqual({ weeklyGoal: 2 });
    expect(client.getQueryData(['workout-goal', 'aluno-a'])).toEqual({ weeklyGoal: 4 });
    expect(client.getQueryData(['workout-goal', 'aluno-b'])).toEqual({ weeklyGoal: 2 });
  });
});

vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));
