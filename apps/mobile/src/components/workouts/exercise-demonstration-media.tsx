import { type Image as ExpoImage, Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import type { SessionExerciseMedia } from '../../application/exercises/session-exercise-media';
import { colors, radii } from '../../lib/design-system/tokens';
import { Button, Text } from '../ui/v2';

export type ExerciseDemonstrationMediaRef = {
  exitFullscreen: () => Promise<void>;
};

type AvailableMedia = Extract<SessionExerciseMedia, { kind: 'available' }>;

type ExerciseDemonstrationMediaProps = {
  media: AvailableMedia;
  active: boolean;
  onError: () => void;
  onFullscreenChange: (active: boolean) => void;
  presentation?: 'default' | 'inline';
  playOnMount?: boolean;
  onLoadingChange?: (loading: boolean) => void;
};

export const ExerciseDemonstrationMedia = forwardRef<
  ExerciseDemonstrationMediaRef,
  ExerciseDemonstrationMediaProps
>(function ExerciseDemonstrationMedia(props, ref) {
  if (props.media.format === 'gif') {
    return <GifDemonstrationMedia {...props} ref={ref} />;
  }

  return <VideoDemonstrationMedia {...props} ref={ref} />;
});

const VideoDemonstrationMedia = forwardRef<
  ExerciseDemonstrationMediaRef,
  ExerciseDemonstrationMediaProps
>(function VideoDemonstrationMedia(
  {
    media,
    active,
    onError,
    onFullscreenChange,
    presentation = 'default',
    playOnMount = false,
    onLoadingChange,
  },
  ref,
) {
  const player = useVideoPlayer({ uri: media.uri }, (createdPlayer) => {
    createdPlayer.muted = true;
    createdPlayer.loop = false;
    createdPlayer.staysActiveInBackground = false;
    createdPlayer.showNowPlayingNotification = false;
    createdPlayer.allowsExternalPlayback = false;
    createdPlayer.pause();
  });
  const videoViewRef = useRef<VideoView>(null);
  const onErrorRef = useRef(onError);
  const onLoadingChangeRef = useRef(onLoadingChange);
  const mountedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const retryingRef = useRef(false);

  useEffect(() => {
    onErrorRef.current = onError;
    onLoadingChangeRef.current = onLoadingChange;
  }, [onError, onLoadingChange]);

  useImperativeHandle(
    ref,
    () => ({
      exitFullscreen: async () => {
        await videoViewRef.current?.exitFullscreen();
      },
    }),
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    player.muted = true;
    player.staysActiveInBackground = false;
    player.showNowPlayingNotification = false;
    player.pause();
    onLoadingChangeRef.current?.(player.status !== 'readyToPlay' && player.status !== 'error');
    if (player.status === 'error') {
      setHasError(true);
      onErrorRef.current();
    } else if (playOnMount && active) player.play();
    const statusSubscription = player.addListener('statusChange', ({ status }) => {
      onLoadingChangeRef.current?.(status === 'loading' || status === 'idle');
      if (status === 'error') {
        setHasError(true);
        onErrorRef.current();
      } else if (status === 'readyToPlay') {
        setHasError(false);
      }
    });
    const playingSubscription = player.addListener('playingChange', ({ isPlaying: playing }) => {
      setIsPlaying(playing);
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        player.pause();
        setIsPlaying(false);
      }
    });

    return () => {
      statusSubscription.remove();
      playingSubscription.remove();
      appStateSubscription.remove();
      mountedRef.current = false;
    };
  }, [active, player, playOnMount]);

  useEffect(() => {
    if (!active) {
      player.pause();
      setIsPlaying(false);
    }
  }, [active, player]);

  const retry = async () => {
    if (retryingRef.current) return;
    retryingRef.current = true;
    setRetrying(true);

    try {
      await player.replaceAsync(media.uri);
      if (mountedRef.current) {
        player.pause();
        setHasError(false);
      }
    } catch {
      if (mountedRef.current) {
        setHasError(true);
        onErrorRef.current();
      }
    } finally {
      retryingRef.current = false;
      if (mountedRef.current) setRetrying(false);
    }
  };

  return (
    <View className="gap-3">
      <VideoView
        ref={videoViewRef}
        player={player}
        nativeControls
        allowsPictureInPicture={false}
        fullscreenOptions={{ enable: true }}
        onFullscreenEnter={() => onFullscreenChange(true)}
        onFullscreenExit={() => onFullscreenChange(false)}
        contentFit="contain"
        style={{
          width: '100%',
          height: presentation === 'inline' ? undefined : 240,
          aspectRatio: presentation === 'inline' ? 16 / 9 : undefined,
          backgroundColor: colors.sessionBackground,
          borderRadius: radii.card,
        }}
      />
      {hasError ? (
        <View className="gap-3">
          <Text className="text-v2-error" variant="body">
            Não foi possível reproduzir este vídeo.
          </Text>
          <Button
            disabled={retrying}
            label="Tentar novamente"
            loading={retrying}
            onPress={() => void retry()}
            variant="secondary"
          />
        </View>
      ) : presentation === 'inline' ? null : (
        <Button
          disabled={!active}
          label={isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo'}
          onPress={() => {
            if (isPlaying) {
              player.pause();
              setIsPlaying(false);
            } else {
              player.play();
              setIsPlaying(true);
            }
          }}
          variant="secondary"
        />
      )}
    </View>
  );
});

const GifDemonstrationMedia = forwardRef<
  ExerciseDemonstrationMediaRef,
  ExerciseDemonstrationMediaProps
>(function GifDemonstrationMedia(
  { media, active, onError, presentation = 'default', playOnMount = false, onLoadingChange },
  ref,
) {
  const imageRef = useRef<ExpoImage>(null);
  const onErrorRef = useRef(onError);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const retryingRef = useRef(false);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useImperativeHandle(ref, () => ({ exitFullscreen: async () => undefined }), []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void imageRef.current?.stopAnimating();
        setIsAnimating(false);
      }
    });

    return () => {
      subscription.remove();
      void imageRef.current?.stopAnimating();
    };
  }, []);

  useEffect(() => {
    if (!active) {
      void imageRef.current?.stopAnimating();
      setIsAnimating(false);
    }
  }, [active]);

  const retry = async () => {
    if (retryingRef.current) return;
    retryingRef.current = true;
    setRetrying(true);

    try {
      await imageRef.current?.reloadAsync();
      setHasError(false);
    } catch {
      setHasError(true);
      onErrorRef.current();
    } finally {
      retryingRef.current = false;
      setRetrying(false);
    }
  };

  return (
    <View className="gap-3">
      <Image
        ref={imageRef}
        source={{ uri: media.uri }}
        accessibilityLabel="Animação de demonstração do exercício"
        autoplay={false}
        onLoadStart={() => onLoadingChange?.(true)}
        onLoad={() => {
          onLoadingChange?.(false);
          if (playOnMount && active) {
            void imageRef.current?.startAnimating();
            setIsAnimating(true);
          }
        }}
        contentFit="contain"
        onError={() => {
          setHasError(true);
          onErrorRef.current();
        }}
        style={{
          width: '100%',
          height: presentation === 'inline' ? undefined : 240,
          aspectRatio: presentation === 'inline' ? 16 / 9 : undefined,
          backgroundColor: colors.sessionBackground,
          borderRadius: radii.card,
        }}
      />
      {hasError ? (
        <View className="gap-3">
          <Text className="text-v2-error" variant="body">
            Não foi possível carregar esta animação.
          </Text>
          <Button
            disabled={retrying}
            label="Tentar novamente"
            loading={retrying}
            onPress={() => void retry()}
            variant="secondary"
          />
        </View>
      ) : (
        <Button
          disabled={!active}
          label={isAnimating ? 'Pausar animação' : 'Reproduzir animação'}
          onPress={() => {
            if (isAnimating) {
              void imageRef.current?.stopAnimating();
              setIsAnimating(false);
            } else {
              void imageRef.current?.startAnimating();
              setIsAnimating(true);
            }
          }}
          variant="secondary"
        />
      )}
    </View>
  );
});
