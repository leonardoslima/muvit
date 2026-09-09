import type { TrainerStudent } from '../../application/trainer/trainer-data';
import { colors } from '../../lib/styles';
import { StatusBadge } from '../ui/status-badge';

export type StudentStatusBadgeProps = {
  status: TrainerStudent['status'];
};

const statusCopy = {
  active: 'Ativo',
  paused: 'Pausado',
  inactive: 'Inativo',
} as const satisfies Record<TrainerStudent['status'], string>;

export function studentStatusLabel(status: TrainerStudent['status']): string {
  return statusCopy[status];
}

const statusStyles = {
  active: {
    backgroundColor: colors.primarySoft,
    borderColor: undefined,
    textColor: colors.primaryText,
  },
  paused: {
    backgroundColor: colors.warningSoft,
    borderColor: undefined,
    textColor: colors.warningText,
  },
  inactive: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    textColor: colors.muted,
  },
} as const satisfies Record<
  TrainerStudent['status'],
  { backgroundColor: string; textColor: string; borderColor?: string }
>;

export function StudentStatusBadge({ status }: StudentStatusBadgeProps) {
  const visualStyle = statusStyles[status];

  return (
    <StatusBadge
      {...visualStyle}
      label={studentStatusLabel(status)}
      testID="student-status-badge"
    />
  );
}
