import { StyleSheet, Text, View } from 'react-native';
import type { TrainerStudent } from '../../application/trainer/trainer-data';
import { colors, radii, spacing, typography } from '../../lib/styles';

export type StudentStatusBadgeProps = {
  status: TrainerStudent['status'];
};

const statusCopy = {
  active: 'Ativo',
  paused: 'Pausado',
  inactive: 'Inativo',
} as const satisfies Record<TrainerStudent['status'], string>;

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
    <View
      style={[
        styles.container,
        {
          backgroundColor: visualStyle.backgroundColor,
          borderColor: visualStyle.borderColor,
          borderWidth: visualStyle.borderColor ? 1 : 0,
        },
      ]}
      testID="student-status-badge"
    >
      <Text style={[styles.text, { color: visualStyle.textColor }]}>{statusCopy[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    ...typography.labelCompact,
  },
});
