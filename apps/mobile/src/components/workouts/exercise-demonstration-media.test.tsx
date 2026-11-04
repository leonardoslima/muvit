import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createRef, useEffect } from 'react';
import { View } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionExerciseMedia } from '../../application/exercises/session-exercise-media';
import { ExerciseDemonstrationMedia } from './exercise-demonstration-media';

const playerState = vi.hoisted(() => ({
  player: {
    muted: false,
    playing: false,
    released: false,
    status: 'loading' as 'loading' | 'error' | 'readyToPlay',
    pause: vi.fn(),
    play: vi.fn(),
    release: vi.fn(),
    replaceAsync: vi.fn(),
    addListener: vi.fn(),
  },
  videoProps: {} as Record<string, unknown>,
  imageProps: {} as Record<string, unknown>,
  imageAnimation: {
    startAnimating: vi.fn(),
    stopAnimating: vi.fn(),
  },
  useVideoPlayer: vi.fn(),
  exitFullscreen: vi.fn(),
  listeners: {} as Record<string, (event?: { status?: string; isPlaying?: boolean }) => void>,
}));
const appStateState = vi.hoisted(() => ({
  addEventListener:
    vi.fn<(event: string, listener: (state: string) => void) => { remove: () => void }>(),
}));

vi.mock('react-native', async (importOriginal) => {
  const native = await importOriginal<typeof import('react-native')>();
  return {
    ...native,
    AppState: { addEventListener: appStateState.addEventListener },
  };
});

vi.mock('expo-video', async () => {
  const React = await import('react');
  const { View } = await import('react-native');
  return {
    useVideoPlayer: playerState.useVideoPlayer,
    VideoView: React.forwardRef((props: Record<string, unknown>, ref) => {
      playerState.videoProps = props;
      React.useImperativeHandle(ref, () => ({ exitFullscreen: playerState.exitFullscreen }), []);
      return React.createElement(View, { testID: 'native-video-view' });
    }),
  };
});

vi.mock('expo-image', async () => {
  const React = await import('react');
  const { View } = await import('react-native');
  return {
    Image: React.forwardRef((props: Record<string, unknown>, ref) => {
      playerState.imageProps = props;
      React.useImperativeHandle(ref, () => playerState.imageAnimation, []);
      return React.createElement(View, { testID: 'native-gif-image' });
    }),
  };
});

const video: Extract<SessionExerciseMedia, { kind: 'available' }> = {
  kind: 'available',
  uri: 'https://media.example.test/supino.mp4?token=private',
  format: 'video',
};

const gif: Extract<SessionExerciseMedia, { kind: 'available' }> = {
  kind: 'available',
  uri: 'https://media.example.test/supino.gif?token=private',
  format: 'gif',
};

describe('ExerciseDemonstrationMedia', () => {
  it('reproduz após a intenção explícita no modo inline, com quadro 16:9 e estado de carregamento', () => {
    const onLoadingChange = vi.fn();
    render(
      <ExerciseDemonstrationMedia
        media={video}
        active
        presentation="inline"
        playOnMount
        onLoadingChange={onLoadingChange}
        onError={vi.fn()}
        onFullscreenChange={vi.fn()}
      />,
    );
    expect(playerState.player.play).toHaveBeenCalledOnce();
    expect(playerState.videoProps.style).toMatchObject({ aspectRatio: 16 / 9 });
    expect(screen.queryByRole('button', { name: 'Reproduzir vídeo' })).toBeNull();
    act(() => playerState.listeners.statusChange?.({ status: 'readyToPlay' }));
    expect(onLoadingChange).toHaveBeenLastCalledWith(false);
  });
  beforeEach(() => {
    vi.clearAllMocks();
    appStateState.addEventListener.mockReturnValue({ remove: vi.fn() });
    playerState.player.muted = false;
    playerState.player.playing = false;
    playerState.player.released = false;
    playerState.player.status = 'loading';
    playerState.player.pause.mockImplementation(() => {
      if (playerState.player.released) {
        throw new Error('O player já foi liberado.');
      }
    });
    playerState.player.release.mockImplementation(() => {
      playerState.player.released = true;
    });
    playerState.listeners = {};
    playerState.useVideoPlayer.mockImplementation((_source, configure) => {
      configure(playerState.player);
      useEffect(() => () => playerState.player.release(), []);
      return playerState.player;
    });
    playerState.player.addListener.mockImplementation(
      (event: string, listener: (payload?: { status?: string; isPlaying?: boolean }) => void) => {
        playerState.listeners[event] = listener;
        return { remove: vi.fn() };
      },
    );
    playerState.player.replaceAsync.mockResolvedValue(undefined);
    playerState.exitFullscreen.mockResolvedValue(undefined);
  });

  it('reporta erro nativo que ocorreu antes da inscrição no listener', () => {
    playerState.player.status = 'error';
    const onError = vi.fn();
    render(
      <ExerciseDemonstrationMedia
        media={video}
        active
        presentation="inline"
        playOnMount
        onError={onError}
        onFullscreenChange={vi.fn()}
      />,
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(playerState.player.play).not.toHaveBeenCalled();
  });

  it('inicia o vídeo pausado e sem áudio, com controles nativos e reprodução explícita', () => {
    render(
      <ExerciseDemonstrationMedia
        media={video}
        active
        onError={vi.fn()}
        onFullscreenChange={vi.fn()}
      />,
    );

    expect(playerState.player.muted).toBe(true);
    expect(playerState.player.pause).toHaveBeenCalled();
    expect(playerState.videoProps.nativeControls).toBe(true);
    expect(playerState.videoProps.allowsPictureInPicture).toBe(false);
    expect(playerState.videoProps.fullscreenOptions).toEqual({ enable: true });
    expect(screen.getByRole('button', { name: /reproduzir vídeo/i })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: /reproduzir vídeo/i }));
    expect(playerState.player.play).toHaveBeenCalledOnce();
  });

  it('para o vídeo ao ocultar ou desmontar e consome fullscreen antes de fechar', async () => {
    const onFullscreenChange = vi.fn();
    const ref = createRef<{ exitFullscreen: () => Promise<void> }>();
    const { rerender, unmount } = render(
      <ExerciseDemonstrationMedia
        ref={ref}
        media={video}
        active
        onError={vi.fn()}
        onFullscreenChange={onFullscreenChange}
      />,
    );
    const fullscreenEnter = playerState.videoProps.onFullscreenEnter as () => void;
    act(() => fullscreenEnter());
    await act(async () => ref.current?.exitFullscreen());

    expect(playerState.exitFullscreen).toHaveBeenCalledOnce();
    expect(onFullscreenChange).toHaveBeenCalledOnce();
    expect(onFullscreenChange).toHaveBeenCalledWith(true);

    rerender(
      <ExerciseDemonstrationMedia
        ref={ref}
        media={video}
        active={false}
        onError={vi.fn()}
        onFullscreenChange={onFullscreenChange}
      />,
    );
    expect(playerState.player.pause).toHaveBeenCalled();
    unmount();
    expect(playerState.player.pause).toHaveBeenCalled();
  });

  it('inicia GIF inline somente depois da intenção e do carregamento da imagem real', () => {
    const onLoadingChange = vi.fn();
    render(
      <ExerciseDemonstrationMedia
        media={gif}
        active
        presentation="inline"
        playOnMount
        onLoadingChange={onLoadingChange}
        onError={vi.fn()}
        onFullscreenChange={vi.fn()}
      />,
    );
    expect(playerState.imageAnimation.startAnimating).not.toHaveBeenCalled();
    expect(playerState.imageProps.style).toMatchObject({ aspectRatio: 16 / 9 });
    act(() => (playerState.imageProps.onLoad as () => void)());
    expect(onLoadingChange).toHaveBeenLastCalledWith(false);
    expect(playerState.imageAnimation.startAnimating).toHaveBeenCalledOnce();
  });

  it('mantém GIF parado até a ação acessível e interrompe ao ficar inativo', () => {
    const { rerender } = render(
      <ExerciseDemonstrationMedia
        media={gif}
        active
        onError={vi.fn()}
        onFullscreenChange={vi.fn()}
      />,
    );

    expect(playerState.imageProps.autoplay).toBe(false);
    expect(screen.getByRole('button', { name: /reproduzir animação/i })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: /reproduzir animação/i }));
    expect(playerState.imageAnimation.startAnimating).toHaveBeenCalledOnce();

    rerender(
      <ExerciseDemonstrationMedia
        media={gif}
        active={false}
        onError={vi.fn()}
        onFullscreenChange={vi.fn()}
      />,
    );
    expect(playerState.imageAnimation.stopAnimating).toHaveBeenCalled();
  });

  it('repetir erro renova somente a fonte da mídia e não aceita reentrada', async () => {
    render(
      <ExerciseDemonstrationMedia
        media={video}
        active
        onError={vi.fn()}
        onFullscreenChange={vi.fn()}
      />,
    );

    const onPlaybackError = playerState.listeners.statusChange;
    act(() => onPlaybackError?.({ status: 'error' }));
    expect(screen.getByText(/não foi possível reproduzir/i)).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: /tentar novamente/i }));
      fireEvent.press(screen.getByRole('button', { name: /tentar novamente/i }));
      await Promise.resolve();
    });

    expect(playerState.player.replaceAsync).toHaveBeenCalledOnce();
    expect(playerState.player.replaceAsync).toHaveBeenCalledWith(video.uri);
  });

  it('bloqueia outra tentativa enquanto a substituição da fonte está pendente', async () => {
    let resolveRetry: (() => void) | undefined;
    playerState.player.replaceAsync.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRetry = resolve;
        }),
    );
    render(
      <ExerciseDemonstrationMedia
        media={video}
        active
        onError={vi.fn()}
        onFullscreenChange={vi.fn()}
      />,
    );
    act(() => playerState.listeners.statusChange?.({ status: 'error' }));

    fireEvent.press(screen.getByRole('button', { name: /tentar novamente/i }));
    fireEvent.press(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(playerState.player.replaceAsync).toHaveBeenCalledOnce();

    await act(async () => resolveRetry?.());
  });

  it('limpa listeners e deixa o hook liberar o player ao fechar', () => {
    const { unmount } = render(
      <ExerciseDemonstrationMedia
        media={video}
        active
        onError={vi.fn()}
        onFullscreenChange={vi.fn()}
      />,
    );
    const subscription = playerState.player.addListener.mock.results[0]?.value as {
      remove: ReturnType<typeof vi.fn>;
    };
    playerState.player.pause.mockClear();

    unmount();

    expect(playerState.player.release).toHaveBeenCalledOnce();
    expect(playerState.player.pause).not.toHaveBeenCalled();
    expect(subscription.remove).toHaveBeenCalledOnce();
  });

  it('ignora a resolução da troca de fonte após desmontar', async () => {
    let resolveRetry: (() => void) | undefined;
    playerState.player.replaceAsync.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRetry = resolve;
        }),
    );
    const onError = vi.fn();
    const { unmount } = render(
      <ExerciseDemonstrationMedia
        media={video}
        active
        onError={onError}
        onFullscreenChange={vi.fn()}
      />,
    );
    act(() => playerState.listeners.statusChange?.({ status: 'error' }));
    fireEvent.press(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(playerState.player.replaceAsync).toHaveBeenCalledOnce();

    unmount();
    playerState.player.pause.mockClear();

    await act(async () => resolveRetry?.());

    expect(playerState.player.released).toBe(true);
    expect(playerState.player.pause).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('ignora a rejeição da troca de fonte após desmontar', async () => {
    let rejectRetry: ((error: Error) => void) | undefined;
    playerState.player.replaceAsync.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectRetry = reject;
        }),
    );
    const onError = vi.fn();
    const { unmount } = render(
      <ExerciseDemonstrationMedia
        media={video}
        active
        onError={onError}
        onFullscreenChange={vi.fn()}
      />,
    );
    act(() => playerState.listeners.statusChange?.({ status: 'error' }));
    fireEvent.press(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(playerState.player.replaceAsync).toHaveBeenCalledOnce();

    unmount();
    await act(async () => rejectRetry?.(new Error('falha tardia')));

    expect(playerState.player.released).toBe(true);
    expect(onError).toHaveBeenCalledOnce();
  });
});
