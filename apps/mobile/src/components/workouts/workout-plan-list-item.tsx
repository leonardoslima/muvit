import type {
  TrainerWorkoutPlanDraft,
  TrainerWorkoutPlanSummary,
} from '../../application/workouts/trainer-workout-data';
import { Card } from '../ui/v2/card';
import { Text } from '../ui/v2/text';
import { WorkoutStatusBadge, workoutStatusLabel } from './workout-status-badge';

type WorkoutPlanListItemCommonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export type WorkoutPlanListItemProps = WorkoutPlanListItemCommonProps &
  (
    | { plan: TrainerWorkoutPlanSummary; draft?: never }
    | { draft: TrainerWorkoutPlanDraft; plan?: never }
  );

export function WorkoutPlanListItem(props: WorkoutPlanListItemProps) {
  if (props.draft) {
    return <DraftListItem disabled={props.disabled} draft={props.draft} onPress={props.onPress} />;
  }

  return <PlanListItem disabled={props.disabled} onPress={props.onPress} plan={props.plan} />;
}

function PlanListItem({
  disabled,
  onPress,
  plan,
}: WorkoutPlanListItemCommonProps & { plan: TrainerWorkoutPlanSummary }) {
  const period = formatWorkoutPeriod(plan.startDate, plan.endDate);

  return (
    <Card
      action={{
        label: `Abrir ${plan.name}, ${workoutStatusLabel(plan.status)}`,
        onPress,
        disabled,
      }}
    >
      <Text variant="sectionTitle">{plan.name}</Text>
      <WorkoutStatusBadge status={plan.status} />
      {period ? <Text className="text-v2-secondary">{period}</Text> : null}
      <Text className="text-v2-secondary" variant="support">
        Criado em {formatDate(plan.createdAt)}
      </Text>
    </Card>
  );
}

function DraftListItem({
  disabled,
  draft,
  onPress,
}: WorkoutPlanListItemCommonProps & { draft: TrainerWorkoutPlanDraft }) {
  const isEditing = draft.sourcePlanId !== null;

  return (
    <Card
      action={{
        label: `Continuar rascunho: ${draft.payload.name}`,
        onPress,
        disabled,
      }}
    >
      <Text variant="sectionTitle">{draft.payload.name}</Text>
      <WorkoutStatusBadge status="draft" />
      <Text className="text-v2-brand" variant="support">
        {isEditing ? 'Alteração em rascunho' : 'Nova prescrição'}
      </Text>
      <Text className="text-v2-secondary" variant="support">
        Atualizado em {formatDate(draft.updatedAt)}
      </Text>
    </Card>
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
