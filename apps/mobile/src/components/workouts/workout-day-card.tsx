import { StyleSheet, Text, View } from 'react-native';
import type { TrainerWorkoutPlan } from '../../application/workouts/trainer-workout-data';
import { muscleGroupLabel } from '../../lib/muscle-groups';
import { colors, sharedStyles, spacing, typography } from '../../lib/styles';
import { Card } from '../ui/card';

export type WorkoutDayCardProps = {
  day: TrainerWorkoutPlan['days'][number];
};

export function WorkoutDayCard({ day }: WorkoutDayCardProps) {
  return (
    <Card>
      <Text style={styles.title}>{day.label}</Text>

      {day.exercises.map((item) => (
        <View key={item.id} style={styles.exercise}>
          <Text style={styles.exerciseName}>{item.exercise.name}</Text>
          <Text style={sharedStyles.subtitle}>{muscleGroupLabel(item.exercise.muscleGroup)}</Text>
          <Text style={sharedStyles.subtitle}>{`${item.sets} séries · ${item.reps} reps`}</Text>
          {item.loadKg !== null ? (
            <Text style={sharedStyles.subtitle}>{`Carga: ${formatDecimal(item.loadKg)} kg`}</Text>
          ) : null}
          {item.restSeconds !== null ? (
            <Text style={sharedStyles.subtitle}>{`Descanso: ${item.restSeconds}s`}</Text>
          ) : null}
          {item.notes?.trim() ? <Text style={sharedStyles.subtitle}>{item.notes}</Text> : null}
        </View>
      ))}
    </Card>
  );
}

function formatDecimal(value: string | number): string {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    ...typography.cardTitle,
  },
  exercise: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  exerciseName: {
    color: colors.ink,
    ...typography.exerciseTitle,
  },
});
