import { StyleSheet, Text, View } from 'react-native';
import type { WorkoutDay } from '../../application/workouts/today-workout';
import { colors, radii, sharedStyles, spacing, typography } from '../../lib/styles';
import { BottomSheet } from '../ui/bottom-sheet';
import { AppButton } from '../ui/button';

export type ExerciseDetailsModalProps = {
  exercise?: WorkoutDay['exercises'][number];
  onClose: () => void;
};

export function ExerciseDetailsModal({ exercise, onClose }: ExerciseDetailsModalProps) {
  if (!exercise) return null;

  return (
    <BottomSheet onClose={onClose} showHandle style={styles.sheet} visible>
      <View style={styles.sheetBody}>
        <View style={styles.content} testID="exercise-details-content">
          <Text style={styles.title}>{exercise.exercise.name}</Text>
          <Text style={styles.subtitle}>Grupo muscular: {exercise.exercise.muscleGroup}</Text>
          <View style={styles.metrics} testID="exercise-details-metrics">
            <View style={styles.metric} testID="exercise-details-metric-sets">
              <Text style={styles.metricValue}>{exercise.sets}</Text>
              <Text style={styles.metricLabel}>Séries</Text>
            </View>
            <View style={styles.metric} testID="exercise-details-metric-reps">
              <Text style={styles.metricValue}>{exercise.reps}</Text>
              <Text style={styles.metricLabel}>Repetições</Text>
            </View>
            <View style={styles.metric} testID="exercise-details-metric-rest">
              <Text style={styles.metricValue}>{exercise.restSeconds ?? 0} s</Text>
              <Text style={styles.metricLabel}>Descanso</Text>
            </View>
          </View>
          {exercise.notes ? (
            <View style={styles.notes} testID="exercise-details-notes">
              <Text style={styles.notesTitle}>Notas do treinador</Text>
              <Text style={styles.notesText}>{exercise.notes}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.closeButton} testID="exercise-details-close-button">
          <AppButton label="Fechar" onPress={onClose} variant="secondary" />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: 614,
    maxHeight: '100%',
  },
  sheetBody: {
    alignSelf: 'stretch',
    gap: spacing.lg,
    height: 558,
  },
  content: {
    flex: 1,
    gap: spacing.lg,
    width: '100%',
  },
  title: {
    color: colors.ink,
    ...typography.sheetTitle,
  },
  subtitle: {
    color: colors.muted,
    ...typography.input,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  metric: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  metricValue: {
    color: colors.ink,
    ...typography.exerciseTitle,
  },
  metricLabel: {
    color: colors.muted,
    ...typography.caption,
  },
  notes: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  notesTitle: {
    color: colors.ink,
    fontFamily: typography.sheetTitle.fontFamily,
    fontSize: typography.subtitle.fontSize,
  },
  notesText: {
    ...sharedStyles.subtitle,
    color: colors.muted,
    fontSize: typography.input.fontSize,
  },
  closeButton: {
    alignSelf: 'center',
    maxWidth: '100%',
    width: 342,
  },
});
