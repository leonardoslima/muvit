import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutDay } from '../../lib/use-guided-workout-session';
import { GuidedSessionDemonstration } from './guided-session-demonstration';

const demoState = vi.hoisted(() => ({
  useMedia: vi.fn(),
  mediaProps: {} as Record<string, unknown>,
  exitFullscreen: vi.fn(),
  appStateListener: undefined as ((state: string) => void) | undefined,
  setAccessibilityFocus: vi.fn(),
  titleNode: { testID: 'demonstration-title-node' },
  findNodeHandle: vi.fn((node: object | null) => (node === demoState.titleNode ? 1 : null)),
}));

vi.mock('react-native', async (importOriginal) => {
  const React = await import('react');
  const native = await importOriginal<typeof import('react-native')>();
  return {
    ...native,
    Text: React.forwardRef((props: Record<string, unknown>, ref) => {
      React.useImperativeHandle(ref, () => demoState.titleNode, []);
      return React.createElement(native.Text, props);
    }),
    AccessibilityInfo: {
      ...native.AccessibilityInfo,
      setAccessibilityFocus: demoState.setAccessibilityFocus,
    },
    AppState: {
      addEventListener: vi.fn((_event: string, listener: (state: string) => void) => {
        demoState.appStateListener = listener;
        return { remove: vi.fn() };
      }),
    },
    findNodeHandle: demoState.findNodeHandle,
  };
});

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

vi.mock('../../lib/use-session-exercise-media', () => ({
  useSessionExerciseMedia: demoState.useMedia,
}));

vi.mock('expo-router', () => ({
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

vi.mock('./exercise-demonstration-media', async () => {
  const React = await import('react');
  const { View } = await import('react-native');
  return {
    ExerciseDemonstrationMedia: React.forwardRef((props: Record<string, unknown>, ref) => {
      demoState.mediaProps = props;
      React.useImperativeHandle(ref, () => ({ exitFullscreen: demoState.exitFullscreen }), []);
      return React.createElement(View, { testID: 'exercise-demonstration-media' });
    }),
  };
});

const exercise: WorkoutDay['exercises'][number] = {
  id: 'workout-exercise-1',
  workoutDayId: 'day-1',
  exerciseId: 'exercise-1',
  exerciseOrder: 0,
  sets: 3,
  reps: '8 a 12',
  loadKg: 40,
  restSeconds: 60,
  tempo: null,
  notes: 'Controle o movimento.',
  exercise: { id: 'exercise-1', name: 'Supino reto', muscleGroup: 'Peito' },
};

function renderDemonstration(
  originPhase: 'set' | 'rest' | 'exercise-complete' = 'set',
  overrides: Partial<React.ComponentProps<typeof GuidedSessionDemonstration>> = {},
) {
  const onClose = vi.fn();
  render(
    <GuidedSessionDemonstration
      visible
      authUserId="student-1"
      dayId="day-1"
      exercise={exercise}
      originPhase={originPhase}
      originContext="Série 2 de 3"
      restEndsAtMs={Date.now() + 42_000}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onClose };
}

describe('GuidedSessionDemonstration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    demoState.appStateListener = undefined;
    demoState.mediaProps = {};
    demoState.exitFullscreen.mockResolvedValue(undefined);
    demoState.useMedia.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      offline: false,
      retry: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['set', 'Voltar à série'],
    ['rest', 'Voltar ao descanso'],
    ['exercise-complete', 'Voltar ao treino'],
  ] as const)('preserva o contexto de origem %s ao exibir %s', (originPhase, returnLabel) => {
    renderDemonstration(originPhase);

    expect(screen.getByRole('button', { name: returnLabel })).toBeTruthy();
    expect(screen.getByText('Série 2 de 3')).toBeTruthy();
    expect(screen.getByText('Supino reto')).toBeTruthy();
    expect(screen.getByText('Prescrição')).toBeTruthy();
    expect(screen.getByText('Controle o movimento.')).toBeTruthy();
    expect(demoState.useMedia).toHaveBeenCalledWith({
      authUserId: 'student-1',
      dayId: 'day-1',
      exerciseId: 'exercise-1',
      enabled: true,
    });
  });

  it('mantém o cabeçalho da demonstração flexível em telas estreitas', () => {
    renderDemonstration();

    expect(screen.getByRole('header', { name: 'Supino reto' })).toBeTruthy();
    expect(screen.getByText('Peito')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fechar demonstração' })).toBeTruthy();
  });

  it('reutiliza a tela de exercício com grupo muscular e estado de vídeo sem mídia', () => {
    demoState.useMedia.mockReturnValue({
      data: { kind: 'missing' },
      error: null,
      isLoading: false,
      isFetching: false,
      offline: false,
      retry: vi.fn(),
    });
    renderDemonstration();
    expect(screen.getByText('Peito')).toBeTruthy();
    expect(screen.getByText('Demonstração indisponível')).toBeTruthy();
    expect(screen.getByText('Este exercício ainda não tem vídeo.')).toBeTruthy();
    expect(screen.queryByText('Demonstração do exercício')).toBeNull();
    expect(screen.getByRole('button', { name: 'Voltar à série' })).toBeTruthy();
  });

  it('mantém detalhes durante carregamento, erro, offline e ausência de mídia', () => {
    const retry = vi.fn();
    demoState.useMedia.mockReturnValue({
      data: undefined,
      error: new Error('Falha de rede.'),
      isLoading: false,
      offline: false,
      retry,
    });
    const { rerender } = render(
      <GuidedSessionDemonstration
        visible
        authUserId="student-1"
        dayId="day-1"
        exercise={exercise}
        originPhase="set"
        originContext="Série 2 de 3"
        restEndsAtMs={42_000}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Prescrição')).toBeTruthy();
    expect(screen.getByText('Não foi possível carregar o vídeo')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(retry).toHaveBeenCalledOnce();

    demoState.useMedia.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      offline: true,
      retry,
    });
    rerender(
      <GuidedSessionDemonstration
        visible
        authUserId="student-1"
        dayId="day-1"
        exercise={exercise}
        originPhase="set"
        originContext="Série 2 de 3"
        restEndsAtMs={42_000}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Prescrição')).toBeTruthy();
    expect(screen.getByText('Vídeo indisponível offline')).toBeTruthy();

    demoState.useMedia.mockReturnValue({
      data: { kind: 'missing' },
      error: null,
      isLoading: false,
      offline: false,
      retry,
    });
    rerender(
      <GuidedSessionDemonstration
        visible
        authUserId="student-1"
        dayId="day-1"
        exercise={exercise}
        originPhase="set"
        originContext="Série 2 de 3"
        restEndsAtMs={42_000}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Prescrição')).toBeTruthy();
    expect(screen.getByText('Este exercício ainda não tem vídeo.')).toBeTruthy();
  });

  it('fecha somente a apresentação local quando o aluno retorna à série', () => {
    const { onClose } = renderDemonstration('set');
    fireEvent.press(screen.getByRole('button', { name: 'Voltar à série' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('não consulta a mídia quando oculta nem quando a identidade está incompleta', () => {
    renderDemonstration('set', { visible: false, authUserId: undefined });

    expect(demoState.useMedia).not.toHaveBeenCalled();
    expect(screen.queryByText('Supino reto')).toBeNull();
  });

  it('leva o foco acessível ao título da demonstração', () => {
    renderDemonstration();

    expect(demoState.findNodeHandle).toHaveBeenCalledWith(demoState.titleNode);
    expect(demoState.setAccessibilityFocus).toHaveBeenCalledWith(1);
  });

  it('mantém a demonstração aberta em 00:00 e oferece voltar à série após expirar', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-14T12:00:00.000Z'));
    renderDemonstration('rest', { restEndsAtMs: Date.now() + 1_000 });

    expect(screen.getByText('00:01')).toBeTruthy();
    vi.setSystemTime(Date.now() + 1_000);
    act(() => demoState.appStateListener?.('active'));

    expect(screen.getByText('00:00')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar à série' })).toBeTruthy();
  });

  it('consome o primeiro retorno em tela cheia e fecha a demonstração no próximo', () => {
    demoState.useMedia.mockReturnValue({
      data: { kind: 'available', uri: 'https://media.example.test/video.mp4', format: 'video' },
      error: null,
      isLoading: false,
      offline: false,
      retry: vi.fn(),
    });
    const { onClose } = renderDemonstration();
    expect(screen.queryByTestId('exercise-demonstration-media')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Assistir demonstração' }));
    const onFullscreenChange = demoState.mediaProps.onFullscreenChange as (active: boolean) => void;

    act(() => onFullscreenChange(true));
    fireEvent(screen.getByTestId('guided-session-demonstration'), 'requestClose');
    expect(demoState.exitFullscreen).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();

    act(() => onFullscreenChange(false));
    fireEvent(screen.getByTestId('guided-session-demonstration'), 'requestClose');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('permite voltar depois de interromper a reprodução ao ir para segundo plano', () => {
    demoState.useMedia.mockReturnValue({
      data: { kind: 'available', uri: 'https://media.example.test/video.mp4', format: 'video' },
      error: null,
      isLoading: false,
      isFetching: false,
      offline: false,
      retry: vi.fn(),
    });
    const { onClose } = renderDemonstration();
    fireEvent.press(screen.getByRole('button', { name: 'Assistir demonstração' }));
    const onFullscreenChange = demoState.mediaProps.onFullscreenChange as (active: boolean) => void;
    act(() => onFullscreenChange(true));
    act(() => demoState.appStateListener?.('background'));
    expect(screen.queryByTestId('exercise-demonstration-media')).toBeNull();
    fireEvent(screen.getByTestId('guided-session-demonstration'), 'requestClose');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
