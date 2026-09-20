import { StyleSheet, Text, View } from 'react-native';
import type { TrainerWorkoutPlan } from '../../application/workouts/trainer-workout-data';
import { colors, radii, sharedStyles, spacing, typography } from '../../lib/styles';
import { Card } from '../ui/card';

export type WorkoutDayCardProps = {
  day: TrainerWorkoutPlan['days'][number];
};

type WorkoutExercise = TrainerWorkoutPlan['days'][number]['exercises'][number];

export function WorkoutDayCard({ day }: WorkoutDayCardProps) {
  return (
    <View style={styles.daySection} testID="workout-day-section">
      <View style={styles.dayHeader}>
        <Text style={styles.title}>{day.label}</Text>
        <Text style={styles.exerciseCount}>{formatExerciseCount(day.exercises.length)}</Text>
      </View>

      {day.exercises.map((item) => (
        <Card key={item.id} testID={`workout-day-exercise-${item.id}`} style={styles.exercise}>
          <Text style={styles.exerciseName}>{item.exercise.name}</Text>
          <Text style={styles.exercisePrescription}>{formatPrescription(item)}</Text>
          {item.restSeconds !== null ? (
            <Text style={styles.exerciseRest}>{`Descanso: ${item.restSeconds} s`}</Text>
          ) : null}
          {item.notes?.trim() ? (
            <Text style={styles.exerciseNotes}>{`Notas: ${item.notes.trim()}`}</Text>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

function formatExerciseCount(count: number): string {
  return `${count} exercício${count === 1 ? '' : 's'}`;
}

function formatPrescription(item: WorkoutExercise): string {
  const load = item.loadKg === null ? '' : ` • ${formatDecimal(item.loadKg)} kg`;
  return `${item.sets} séries • ${item.reps} repetições${load}`;
}

function formatDecimal(value: string | number): string {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

const styles = StyleSheet.create({
  daySection: {
    gap: spacing.sm,
  },
  dayHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  exerciseCount: {
    color: '#3498DB',
    fontFamily: typography.bodyStrong.fontFamily,
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: colors.ink,
    fontFamily: typography.title.fontFamily,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  exercise: {
    borderRadius: radii.md,
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  exerciseRest: {
    ...sharedStyles.subtitle,
    fontSize: 11,
    lineHeight: 13,
  },
  exerciseNotes: {
    ...sharedStyles.subtitle,
    fontSize: 11,
    lineHeight: 15,
  },
  exercisePrescription: {
    color: colors.ink,
    ...typography.bodyStrong,
    fontSize: 11,
    lineHeight: 13,
  },
  exerciseName: {
    color: colors.ink,
    fontFamily: typography.title.fontFamily,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
});
