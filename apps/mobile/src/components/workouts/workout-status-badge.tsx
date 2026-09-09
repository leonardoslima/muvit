import { StyleSheet } from 'react-native';
import type { TrainerWorkoutPlanSummary } from '../../application/workouts/trainer-workout-data';
import { colors } from '../../lib/styles';
import { StatusBadge } from '../ui/status-badge';

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
    <StatusBadge
      {...visualStyle}
      label={workoutStatusLabel(status)}
      style={styles.badge}
      testID="workout-status-badge"
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
});
