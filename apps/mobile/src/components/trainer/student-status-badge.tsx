import { Check, Clock3, Minus } from 'lucide-react-native';
import { View } from 'react-native';
import type { TrainerStudent } from '../../application/trainer/trainer-data';
import { cn } from '../../lib/design-system/cn';
import { colors } from '../../lib/design-system/tokens';
import { Text } from '../ui/v2/text';

export type StudentStatusBadgeProps = {
  status: TrainerStudent['status'];
  compact?: boolean;
};

const statusCopy = {
  active: 'Ativo',
  paused: 'Pausado',
  inactive: 'Inativo',
} as const satisfies Record<TrainerStudent['status'], string>;

const statusStyles = {
  active: {
    backgroundClass: 'bg-v2-successBg',
    textClass: 'text-v2-success',
    color: colors.success,
    Icon: Check,
  },
  paused: {
    backgroundClass: 'bg-v2-warningBg',
    textClass: 'text-v2-warning',
    color: colors.warning,
    Icon: Clock3,
  },
  inactive: {
    backgroundClass: 'bg-v2-infoBg',
    textClass: 'text-v2-info',
    color: colors.info,
    Icon: Minus,
  },
} as const satisfies Record<
  TrainerStudent['status'],
  { backgroundClass: string; textClass: string; color: string; Icon: typeof Check }
>;

export function StudentStatusBadge({ status, compact = false }: StudentStatusBadgeProps) {
  const visualStyle = statusStyles[status];
  const Icon = visualStyle.Icon;

  return (
    <View
      accessible
      accessibilityLabel={statusCopy[status]}
      className={cn(
        'flex-row items-center self-start gap-[6px] rounded-full',
        compact ? 'min-h-[24px] px-2 py-1' : 'min-h-[32px] px-3 py-2',
        visualStyle.backgroundClass,
      )}
      testID="student-status-badge"
    >
      <Icon size={compact ? 12 : 14} color={visualStyle.color} accessible={false} />
      <Text className={`shrink font-v2-bold ${visualStyle.textClass}`} variant="support">
        {statusCopy[status]}
      </Text>
    </View>
  );
}
