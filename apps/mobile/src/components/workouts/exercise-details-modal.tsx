import { StyleSheet, Text } from 'react-native';
import type { WorkoutDay } from '../../application/workouts/today-workout';
import { colors, sharedStyles, typography } from '../../lib/styles';
import { BottomSheet } from '../ui/bottom-sheet';
import { AppButton } from '../ui/button';

export type ExerciseDetailsModalProps = {
  exercise?: WorkoutDay['exercises'][number];
  onClose: () => void;
};

export function ExerciseDetailsModal({ exercise, onClose }: ExerciseDetailsModalProps) {
  return (
    <BottomSheet onClose={onClose} showHandle visible={Boolean(exercise)}>
      <Text style={styles.title}>{exercise?.exercise.name}</Text>
      <Text style={sharedStyles.subtitle}>Grupo muscular: {exercise?.exercise.muscleGroup}</Text>
      <Text style={sharedStyles.subtitle}>
        {exercise?.sets} séries de {exercise?.reps} repetições
      </Text>
      <Text style={sharedStyles.subtitle}>Descanso: {exercise?.restSeconds ?? 0} s</Text>
      {exercise?.notes ? <Text style={sharedStyles.subtitle}>{exercise.notes}</Text> : null}
      <AppButton label="Fechar" onPress={onClose} variant="secondary" />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    ...typography.sheetTitle,
  },
});
