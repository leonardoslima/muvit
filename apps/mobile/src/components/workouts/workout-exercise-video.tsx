import { useNavigation } from 'expo-router';
import { CircleAlert, Play, VideoOff, WifiOff } from 'lucide-react-native';
import { type Ref, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, View } from 'react-native';
import {
  colors,
  controlSizes,
  fontFamilies,
  penTokens,
  radii,
  spacing,
} from '../../lib/design-system/tokens';
import { useSessionExerciseMedia } from '../../lib/use-session-exercise-media';
import { Text } from '../ui/v2/text';
import {
  ExerciseDemonstrationMedia,
  type ExerciseDemonstrationMediaRef,
} from './exercise-demonstration-media';

type Props = {
  authUserId: string;
  dayId: string;
  exerciseId: string;
  mediaRef?: Ref<ExerciseDemonstrationMediaRef>;
  onFullscreenChange?: (active: boolean) => void;
};

export function WorkoutExerciseVideo({
  authUserId,
  dayId,
  exerciseId,
  mediaRef,
  onFullscreenChange,
}: Props) {
  const navigation = useNavigation();
  const [active, setActive] = useState(true);
  const [requested, setRequested] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [width, setWidth] = useState(0);
  const media = useSessionExerciseMedia({ authUserId, dayId, exerciseId, enabled: active });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setRequested(false);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const blur = navigation.addListener('blur', () => {
      setActive(false);
      setRequested(false);
    });
    const focus = navigation.addListener('focus', () => setActive(true));
    return () => {
      blur();
      focus();
    };
  }, [navigation]);

  const loading = media.isLoading || media.isFetching;
  const failed = Boolean(media.error || playbackError);
  const available = media.data?.kind === 'available' ? media.data : undefined;
  const playing = Boolean(
    active && requested && available && !media.offline && !failed && !loading,
  );
  useEffect(() => {
    if (!playing) onFullscreenChange?.(false);
  }, [playing, onFullscreenChange]);
  const title = media.offline
    ? 'Vídeo indisponível offline'
    : loading
      ? 'Carregando vídeo…'
      : failed
        ? 'Não foi possível carregar o vídeo'
        : available
          ? 'Assistir demonstração'
          : 'Demonstração indisponível';
  const description = media.offline
    ? 'Conecte-se à internet para assistir.'
    : loading
      ? 'A demonstração está sendo carregada.'
      : failed
        ? 'Tente novamente. Seu treino continua disponível.'
        : available
          ? undefined
          : 'Este exercício ainda não tem vídeo.';
  const Icon = media.offline ? WifiOff : failed ? CircleAlert : VideoOff;

  const notice = (
    <>
      {loading && !media.offline ? (
        <ActivityIndicator accessibilityLabel="Carregando vídeo" color={colors.surface} />
      ) : available && !failed && !media.offline ? (
        <View style={styles.play}>
          <Play accessible={false} size={controlSizes.icon} color={colors.text} />
        </View>
      ) : (
        <Icon accessible={false} size={controlSizes.icon} color={colors.surface} />
      )}
      <Text style={styles.title} accessibilityLiveRegion="polite">
        {title}
      </Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {failed && !media.offline && !loading ? (
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
          style={styles.retry}
          onPress={() => {
            setRequested(false);
            setPlaybackError(false);
            media.retry();
          }}
        >
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      ) : null}
    </>
  );

  if (playing && available)
    return (
      <View style={styles.player}>
        <ExerciseDemonstrationMedia
          ref={mediaRef}
          media={available}
          active
          presentation="inline"
          playOnMount
          onError={() => {
            setPlaybackError(true);
            setRequested(false);
          }}
          onLoadingChange={setPlayerLoading}
          onFullscreenChange={(active) => onFullscreenChange?.(active)}
        />
        {playerLoading ? (
          <View pointerEvents="none" style={styles.loadingOverlay}>
            <ActivityIndicator accessibilityLabel="Carregando vídeo" color={colors.surface} />
            <Text style={styles.title}>Carregando vídeo…</Text>
          </View>
        ) : null}
      </View>
    );

  const noticeStyle = [styles.notice, { minHeight: (width * 9) / 16 }];
  return (
    <View style={styles.frame} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {available && !failed && !media.offline && !loading ? (
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Assistir demonstração"
          style={noticeStyle}
          onPress={() => {
            setPlayerLoading(true);
            setRequested(true);
          }}
        >
          {notice}
        </Pressable>
      ) : (
        <View style={noticeStyle}>{notice}</View>
      )}
    </View>
  );
}

const styles = {
  frame: {
    backgroundColor: colors.text,
    borderRadius: radii.card,
    overflow: 'hidden' as const,
    justifyContent: 'center' as const,
  },
  notice: {
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    color: colors.surface,
    fontFamily: fontFamilies.bold,
    fontSize: penTokens['font/size/15'],
    lineHeight: penTokens['font/size/15'] * 1.35,
    textAlign: 'center' as const,
  },
  description: {
    color: colors.onBrandSecondary,
    fontSize: penTokens['font/size/13'],
    lineHeight: penTokens['font/size/13'] * 1.35,
    textAlign: 'center' as const,
    maxWidth: 240,
  },
  play: {
    width: controlSizes.touch,
    height: controlSizes.touch,
    borderRadius: controlSizes.touch / 2,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  retry: {
    minHeight: controlSizes.touch,
    minWidth: controlSizes.touch,
    paddingHorizontal: spacing.xl,
    width: '100%' as const,
    maxWidth: 240,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  retryText: {
    color: colors.primary,
    fontFamily: fontFamilies.bold,
    fontSize: penTokens['font/size/15'],
  },
  player: { position: 'relative' as const },
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.text,
    borderRadius: radii.card,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
  },
};
