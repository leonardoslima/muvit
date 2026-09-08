import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TrainerWorkoutPlanSummary } from '../../application/workouts/trainer-workout-data';
import { colors, radii, sharedStyles, spacing, typography } from '../../lib/styles';
import { Card } from '../ui/card';
import { WorkoutStatusBadge, workoutStatusLabel } from './workout-status-badge';

export type WorkoutPlanListItemProps = {
  plan: TrainerWorkoutPlanSummary;
  onPress: () => void;
};

export function WorkoutPlanListItem({ onPress, plan }: WorkoutPlanListItemProps) {
  const period = formatWorkoutPeriod(plan.startDate, plan.endDate);
  const periodLabel = period ? `, período: ${period}` : '';
  const createdAt = formatDate(plan.createdAt);

  return (
    <Pressable
      accessible
      accessibilityLabel={`Abrir ${plan.name}, status: ${workoutStatusLabel(plan.status)}${periodLabel}, criado em ${createdAt}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}
    >
      <Card>
        <View style={styles.heading}>
          <Text style={styles.name}>{plan.name}</Text>
          <WorkoutStatusBadge status={plan.status} />
        </View>
        {period ? <Text style={sharedStyles.subtitle}>{period}</Text> : null}
        <Text style={sharedStyles.subtitle}>{`Criado em ${createdAt}`}</Text>
      </Card>
    </Pressable>
  );
}

function formatWorkoutPeriod(startDate: string | null, endDate: string | null): string | undefined {
  if (startDate && endDate) {
    return `${formatDate(startDate)} — ${formatDate(endDate)}`;
  }
  if (startDate) return `A partir de ${formatDate(startDate)}`;
  if (endDate) return `Até ${formatDate(endDate)}`;
  return undefined;
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radii.lg,
  },
  pressed: {
    opacity: 0.8,
  },
  heading: {
    gap: spacing.sm,
  },
  name: {
    color: colors.ink,
    ...typography.cardTitle,
  },
});
