import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Modal,
  type Text as NativeText,
  View,
  findNodeHandle,
} from 'react-native';
import { spacing } from '../../lib/design-system/tokens';
import type { WorkoutDay } from '../../lib/use-guided-workout-session';
import { Screen } from '../ui/screen';
import { Button, Text } from '../ui/v2';
import type { ExerciseDemonstrationMediaRef } from './exercise-demonstration-media';
import { WorkoutExerciseContent, WorkoutExerciseHeader } from './workout-exercise-content';

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
        <Screen
          scroll
          contentContainerStyle={{ flexGrow: 1, gap: spacing.xxl, paddingBottom: spacing.xxxl }}
        >
          <WorkoutExerciseHeader
            exercise={exercise}
            onBack={handleRequestClose}
            backLabel="Fechar demonstração"
            context={originContext}
            titleRef={titleRef}
          />
          <WorkoutExerciseContent
            exercise={exercise}
            authUserId={authUserId}
            dayId={dayId ?? exercise.workoutDayId}
            mediaRef={mediaRef}
            onFullscreenChange={onFullscreenChange}
          />
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
          <Button label={returnLabel} onPress={handleRequestClose} />
        </Screen>
      ) : null}
    </Modal>
  );
}
