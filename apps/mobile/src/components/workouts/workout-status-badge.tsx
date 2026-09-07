import { StyleSheet, Text, View } from 'react-native';
import type { TrainerWorkoutPlanSummary } from '../../application/workouts/trainer-workout-data';
import { colors, radii, spacing, typography } from '../../lib/styles';

export type WorkoutStatusBadgeProps = {
  status: TrainerWorkoutPlanSummary['status'];
};

const statusCopy = {
  active: 'Ativo',
  draft: 'Rascunho',
  archived: 'Arquivado',
} as const satisfies Record<TrainerWorkoutPlanSummary['status'], string>;

const statusStyles = {
  active: {
    backgroundColor: colors.primarySoft,
    borderColor: undefined,
    textColor: colors.primaryText,
  },
  draft: {
    backgroundColor: colors.warningSoft,
    borderColor: undefined,
    textColor: colors.warningText,
  },
  archived: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    textColor: colors.muted,
  },
} as const satisfies Record<
  TrainerWorkoutPlanSummary['status'],
  { backgroundColor: string; textColor: string; borderColor?: string }
>;

export function workoutStatusLabel(status: TrainerWorkoutPlanSummary['status']): string {
  return statusCopy[status];
}

export function WorkoutStatusBadge({ status }: WorkoutStatusBadgeProps) {
  const visualStyle = statusStyles[status];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: visualStyle.backgroundColor,
          borderColor: visualStyle.borderColor,
          borderWidth: visualStyle.borderColor ? 1 : 0,
        },
      ]}
      testID="workout-status-badge"
    >
      <Text style={[styles.text, { color: visualStyle.textColor }]}>
        {workoutStatusLabel(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    ...typography.labelCompact,
  },
});
