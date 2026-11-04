import { ArrowLeft } from 'lucide-react-native';
import type { Ref } from 'react';
import { type Text as NativeText, View } from 'react-native';
import type { WorkoutDay } from '../../application/workouts/today-workout';
import { colors } from '../../lib/design-system/tokens';
import { muscleGroupLabel } from '../../lib/muscle-groups';
import { IconButton } from '../ui/v2/icon-button';
import { Text } from '../ui/v2/text';
import type { ExerciseDemonstrationMediaRef } from './exercise-demonstration-media';
import { WorkoutExerciseDetails } from './workout-exercise-details';
import { WorkoutExerciseVideo } from './workout-exercise-video';

type Exercise = WorkoutDay['exercises'][number];
type HeaderProps = {
  exercise?: Exercise;
  onBack: () => void;
  backLabel?: string;
  context?: string;
  titleRef?: Ref<NativeText>;
};

export function WorkoutExerciseHeader({
  exercise,
  onBack,
  backLabel = 'Voltar ao treino',
  context = 'Treino',
  titleRef,
}: HeaderProps) {
  return (
    <View className="gap-6">
      <View className="flex-row items-center gap-3">
        <IconButton
          accessibilityLabel={backLabel}
          icon={<ArrowLeft size={20} color={colors.brand} accessible={false} />}
          onPress={onBack}
        />
        <Text className="text-v2-brand" variant="label">
          {context}
        </Text>
      </View>
      <View className="gap-2">
        <Text ref={titleRef} accessibilityRole="header" variant="screenTitle">
          {exercise?.exercise.name ?? 'Exercício'}
        </Text>
        {exercise ? (
          <Text className="text-v2-secondary" variant="body">
            {muscleGroupLabel(exercise.exercise.muscleGroup)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

type ContentProps = {
  exercise: Exercise;
  authUserId?: string;
  dayId: string;
  mediaRef?: Ref<ExerciseDemonstrationMediaRef>;
  onFullscreenChange?: (active: boolean) => void;
};

export function WorkoutExerciseContent({
  exercise,
  authUserId,
  dayId,
  mediaRef,
  onFullscreenChange,
}: ContentProps) {
  return (
    <>
      {authUserId ? (
        <WorkoutExerciseVideo
          key={`${authUserId}:${dayId}:${exercise.id}:${exercise.exerciseId}`}
          authUserId={authUserId}
          dayId={dayId}
          exerciseId={exercise.exerciseId}
          mediaRef={mediaRef}
          onFullscreenChange={onFullscreenChange}
        />
      ) : null}
      <WorkoutExerciseDetails exercise={exercise} />
    </>
  );
}
