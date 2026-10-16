import type { TrainerWorkoutPlanSummary } from '../../application/workouts/trainer-workout-data';
import { Badge } from '../ui/v2/badge';

export type WorkoutStatusBadgeProps = {
  status: TrainerWorkoutPlanSummary['status'];
};

const statusPresentation = {
  active: { label: 'Ativo', variant: 'active' },
  draft: { label: 'Rascunho', variant: 'pending' },
  archived: { label: 'Arquivado', variant: 'inactive' },
} as const satisfies Record<
  TrainerWorkoutPlanSummary['status'],
  { label: string; variant: 'active' | 'pending' | 'inactive' }
>;

export function workoutStatusLabel(status: TrainerWorkoutPlanSummary['status']): string {
  return statusPresentation[status].label;
}

export function WorkoutStatusBadge({ status }: WorkoutStatusBadgeProps) {
  const presentation = statusPresentation[status];

  return (
    <Badge
      label={presentation.label}
      variant={presentation.variant}
      testID="workout-status-badge"
    />
  );
}
