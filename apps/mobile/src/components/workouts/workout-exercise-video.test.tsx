import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkoutExerciseVideo } from './workout-exercise-video';

const state = vi.hoisted(() => ({
  media: {
    data: undefined,
    error: null,
    offline: false,
    isLoading: true,
    isFetching: false,
    retry: vi.fn(),
  } as Record<string, unknown>,
  hook: vi.fn(),
  listeners: {} as Record<string, () => void>,
  player: {} as Record<string, unknown>,
  appState: undefined as ((value: string) => void) | undefined,
}));
vi.mock('react-native', async (importOriginal) => {
  const native = await importOriginal<typeof import('react-native')>();
  return {
    ...native,
    AppState: {
      addEventListener: (_event: string, listener: (value: string) => void) => {
        state.appState = listener;
        return { remove: vi.fn() };
      },
    },
  };
});
vi.mock('../../lib/use-session-exercise-media', () => ({ useSessionExerciseMedia: state.hook }));
vi.mock('expo-router', () => ({
  useNavigation: () => ({
    addListener: (event: string, listener: () => void) => {
      state.listeners[event] = listener;
      return () => undefined;
    },
  }),
}));
vi.mock('./exercise-demonstration-media', async () => {
  const { View } = await import('react-native');
  return {
    ExerciseDemonstrationMedia: (props: Record<string, unknown>) => {
      state.player = props;
      return <View testID="video-player" />;
    },
  };
});
const props = { authUserId: 'owner-a', dayId: 'day-a', exerciseId: 'catalog-exercise-a' };
describe('WorkoutExerciseVideo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.listeners = {};
    state.media = {
      data: undefined,
      error: null,
      offline: false,
      isLoading: true,
      isFetching: false,
      retry: vi.fn(),
    };
    state.hook.mockImplementation(() => state.media);
  });
  it('mostra carregamento e consulta o exercício de catálogo no contexto do proprietário', () => {
    render(<WorkoutExerciseVideo {...props} />);
    expect(screen.getByText('Carregando vídeo…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
    expect(state.hook).toHaveBeenCalledWith({ ...props, enabled: true });
  });
  it.each([
    [
      { offline: true, isLoading: false },
      'Vídeo indisponível offline',
      'Conecte-se à internet para assistir.',
    ],
    [
      { data: { kind: 'missing' }, isLoading: false },
      'Demonstração indisponível',
      'Este exercício ainda não tem vídeo.',
    ],
  ])('exibe estado sem mídia sem ação de reprodução ou retry', (media, title, description) => {
    Object.assign(state.media, media);
    render(<WorkoutExerciseVideo {...props} />);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(description)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('permite retry de erro e bloqueia durante a atualização', () => {
    Object.assign(state.media, { error: new Error('rede'), isLoading: false });
    const view = render(<WorkoutExerciseVideo {...props} />);
    expect(screen.getByText('Não foi possível carregar o vídeo')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(state.media.retry).toHaveBeenCalledOnce();
    state.media.isFetching = true;
    view.rerender(<WorkoutExerciseVideo {...props} />);
    expect(screen.getByText('Carregando vídeo…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
  });
  it('só monta o player após ação explícita e desmonta ao perder foco', () => {
    Object.assign(state.media, {
      data: { kind: 'available', uri: 'https://media.test/a.mp4', format: 'video' },
      isLoading: false,
    });
    render(<WorkoutExerciseVideo {...props} />);
    expect(screen.queryByTestId('video-player')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Assistir demonstração' }));
    expect(screen.getByTestId('video-player')).toBeTruthy();
    expect(state.player).toMatchObject({ active: true, presentation: 'inline', playOnMount: true });
    act(() => state.listeners.blur?.());
    expect(screen.queryByTestId('video-player')).toBeNull();
  });
  it('converte erro do player no estado do Pen e permite tentar novamente', () => {
    Object.assign(state.media, {
      data: { kind: 'available', uri: 'https://media.test/a.mp4', format: 'video' },
      isLoading: false,
    });
    render(<WorkoutExerciseVideo {...props} />);
    fireEvent.press(screen.getByRole('button', { name: 'Assistir demonstração' }));
    act(() => (state.player.onError as () => void)());
    expect(screen.queryByTestId('video-player')).toBeNull();
    expect(screen.getByText('Não foi possível carregar o vídeo')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(state.media.retry).toHaveBeenCalledOnce();
  });
  it('não retoma sozinho depois de enviar o app para segundo plano', () => {
    Object.assign(state.media, {
      data: { kind: 'available', uri: 'https://media.test/a.mp4', format: 'video' },
      isLoading: false,
    });
    render(<WorkoutExerciseVideo {...props} />);
    fireEvent.press(screen.getByRole('button', { name: 'Assistir demonstração' }));
    act(() => state.appState?.('background'));
    expect(screen.queryByTestId('video-player')).toBeNull();
    act(() => state.appState?.('active'));
    expect(screen.queryByTestId('video-player')).toBeNull();
    expect(screen.getByRole('button', { name: 'Assistir demonstração' })).toBeTruthy();
  });
});
