import { X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Modal,
  type Text as NativeText,
  ScrollView,
  View,
  findNodeHandle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../../lib/design-system/tokens';
import type { WorkoutDay } from '../../lib/use-guided-workout-session';
import { useSessionExerciseMedia } from '../../lib/use-session-exercise-media';
import { Button, IconButton, Message, Text } from '../ui/v2';
import {
  ExerciseDemonstrationMedia,
  type ExerciseDemonstrationMediaRef,
} from './exercise-demonstration-media';
import { WorkoutExerciseDetails } from './workout-exercise-details';

export type GuidedSessionDemonstrationPhase = 'set' | 'rest' | 'exercise-complete';

export type GuidedSessionDemonstrationProps = {
  visible: boolean;
  authUserId?: string;
  dayId?: string;
  exercise: WorkoutDay['exercises'][number];
  originPhase: GuidedSessionDemonstrationPhase;
  originContext: string;
  restEndsAtMs: number | null;
  onClose: () => void;
};

export function GuidedSessionDemonstration({
  visible,
  authUserId,
  dayId,
  exercise,
  originPhase,
  originContext,
  restEndsAtMs,
  onClose,
}: GuidedSessionDemonstrationProps): React.JSX.Element {
  const titleRef = useRef<NativeText>(null);
  const mediaRef = useRef<ExerciseDemonstrationMediaRef>(null);
  const fullscreenRef = useRef(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const media = useSessionExerciseMedia({
    authUserId,
    dayId,
    exerciseId: exercise.exerciseId,
    enabled: visible,
  });

  useEffect(() => {
    if (!visible) return;
    const node = findNodeHandle(titleRef.current);
    if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
  }, [visible]);

  useEffect(() => {
    if (!visible || originPhase !== 'rest') return;

    const updateNow = () => setNowMs(Date.now());
    updateNow();
    const interval = setInterval(updateNow, 1_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateNow();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [originPhase, visible]);

  const onFullscreenChange = useCallback((active: boolean) => {
    fullscreenRef.current = active;
  }, []);

  const handleRequestClose = () => {
    if (fullscreenRef.current) {
      void mediaRef.current?.exitFullscreen().catch(() => {
        fullscreenRef.current = false;
      });
      return;
    }
    onClose();
  };

  const returnLabel =
    originPhase === 'set'
      ? 'Voltar à série'
      : originPhase === 'rest'
        ? 'Voltar ao descanso'
        : 'Voltar ao treino';
  const remainingSeconds = Math.max(0, Math.ceil(((restEndsAtMs ?? nowMs) - nowMs) / 1_000));
  const timer = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(
    remainingSeconds % 60,
  ).padStart(2, '0')}`;

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleRequestClose}
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
      testID="guided-session-demonstration"
      visible={visible}
    >
      {visible ? (
        <SafeAreaView
          edges={['top', 'right', 'bottom', 'left']}
          style={{ flex: 1, backgroundColor: colors.background }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              gap: spacing.xxl,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.lg,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="w-full max-w-2xl self-center gap-6">
              <View className="flex-row items-center gap-3">
                <IconButton
                  accessibilityLabel="Fechar demonstração"
                  icon={<X accessible={false} color={colors.brand} size={20} />}
                  onPress={handleRequestClose}
                  variant="secondary"
                />
                <Text
                  ref={titleRef}
                  accessibilityRole="header"
                  className="min-w-0 flex-1 text-center text-v2-text"
                  variant="sectionTitle"
                >
                  Demonstração do exercício
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-v2-secondary" variant="support">
                  {originContext}
                </Text>
                <Text accessibilityRole="header" className="text-v2-text" variant="screenTitle">
                  {exercise.exercise.name}
                </Text>
              </View>

              <View
                className="gap-4 rounded-v2-card border border-v2-border bg-v2-surface p-5"
                style={{ borderRadius: radii.card }}
              >
                {media.isLoading ? (
                  <MediaNotice>Carregando demonstração…</MediaNotice>
                ) : media.offline ? (
                  <MediaNotice>Sem conexão. A demonstração pode não estar disponível.</MediaNotice>
                ) : media.error ? (
                  <View className="gap-3">
                    <Message
                      description="Verifique sua conexão e tente carregar novamente."
                      title="Não foi possível carregar a demonstração."
                      variant="error"
                    />
                    <Button label="Tentar novamente" onPress={media.retry} variant="secondary" />
                  </View>
                ) : media.data?.kind === 'available' ? (
                  <ExerciseDemonstrationMedia
                    ref={mediaRef}
                    active={visible}
                    media={media.data}
                    onError={() => undefined}
                    onFullscreenChange={onFullscreenChange}
                  />
                ) : media.data?.kind === 'missing' ? (
                  <MediaNotice>Sem demonstração disponível para este exercício.</MediaNotice>
                ) : (
                  <MediaNotice>Não foi possível consultar a demonstração.</MediaNotice>
                )}
              </View>

              <View
                className="gap-4 rounded-v2-card bg-v2-surface p-5"
                style={{ borderRadius: radii.card }}
              >
                <WorkoutExerciseDetails exercise={exercise} />
                {originPhase === 'rest' ? (
                  <View className="items-center gap-2 rounded-v2-card bg-v2-subtle px-4 py-3">
                    <Text className="text-v2-secondary" variant="support">
                      Tempo restante
                    </Text>
                    <Text
                      accessibilityLiveRegion="polite"
                      className="text-v2-text"
                      maxFontSizeMultiplier={1.4}
                      variant="timer"
                    >
                      {timer}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Button label={returnLabel} onPress={onClose} />
            </View>
          </ScrollView>
        </SafeAreaView>
      ) : null}
    </Modal>
  );
}

function MediaNotice({ children }: { children: string }): React.JSX.Element {
  return (
    <View
      className="min-h-[220px] items-center justify-center rounded-v2-card bg-v2-sessionSurface p-6"
      style={{ borderRadius: radii.card }}
    >
      <Text className="text-center text-v2-sessionText" variant="body">
        {children}
      </Text>
    </View>
  );
}
