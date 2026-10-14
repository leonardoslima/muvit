import { View } from 'react-native';
import type { WorkoutDay } from '../../application/workouts/today-workout';
import { Surface } from '../ui/v2/surface';
import { Text } from '../ui/v2/text';

export function WorkoutExerciseDetails({
  exercise,
}: {
  exercise: WorkoutDay['exercises'][number];
}): React.JSX.Element {
  const observation = exercise.notes?.trim();

  return (
    <>
      <View className="gap-3">
        <Text variant="sectionTitle">Prescrição</Text>
        <Text variant="action">
          {exercise.sets} séries · {exercise.reps} repetições
        </Text>
        <Text className="text-v2-secondary" variant="body">
          Descanso: {exercise.restSeconds ?? 0} s
        </Text>
      </View>
      {observation ? (
        <Surface variant="subtle" className="gap-2 rounded-v2-card p-4">
          <Text className="text-v2-brand" variant="label">
            Observação
          </Text>
          <Text>{observation}</Text>
        </Surface>
      ) : null}
    </>
  );
}
