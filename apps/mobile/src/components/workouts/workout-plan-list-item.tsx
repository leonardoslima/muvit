import { Ionicons } from '@expo/vector-icons';
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
  const isArchived = plan.status === 'archived';

  return (
    <Pressable
      accessible
      accessibilityLabel={`Abrir ${plan.name}, status: ${workoutStatusLabel(plan.status)}${periodLabel}, criado em ${createdAt}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}
    >
      <Card style={styles.card} testID="workout-plan-card">
        <View style={styles.heading}>
          <View style={styles.identity}>
            <View
              style={[styles.iconBubble, isArchived ? styles.archivedIconBubble : null]}
              testID="workout-plan-icon-bubble"
            >
              <Ionicons
                color={isArchived ? colors.muted : colors.primary}
                name="barbell-outline"
                size={18}
                testID="workout-plan-icon"
              />
            </View>
            <Text numberOfLines={1} style={styles.name}>
              {plan.name}
            </Text>
          </View>
          <WorkoutStatusBadge status={plan.status} />
        </View>
        {period ? <Text style={styles.period}>{period}</Text> : null}
        <View style={styles.footer}>
          <Text style={styles.createdAt}>{`Criado em ${createdAt}`}</Text>
          <Ionicons
            accessible={false}
            color={colors.muted}
            name="chevron-forward"
            size={18}
            testID="workout-plan-chevron"
          />
        </View>
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
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  identity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  archivedIconBubble: {
    backgroundColor: colors.surfaceMuted,
  },
  name: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: typography.title.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  card: {
    borderRadius: radii.md,
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 118,
    padding: spacing.lg,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  period: {
    ...sharedStyles.subtitle,
    fontSize: 13,
    lineHeight: 16,
  },
  createdAt: {
    ...sharedStyles.subtitle,
    fontSize: 12,
    lineHeight: 15,
  },
  pressed: {
    opacity: 0.8,
  },
  pressable: {
    borderRadius: radii.md,
  },
});
