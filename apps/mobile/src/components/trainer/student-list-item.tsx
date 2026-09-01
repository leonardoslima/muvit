import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TrainerStudent } from '../../application/trainer/trainer-data';
import { colors, controlSizes, radii, sharedStyles, spacing, typography } from '../../lib/styles';
import { Card } from '../ui/card';
import { StudentStatusBadge } from './student-status-badge';

export type StudentListItemProps = {
  student: TrainerStudent;
  onPress: () => void;
};

export function StudentListItem({ onPress, student }: StudentListItemProps) {
  return (
    <Pressable
      accessible
      accessibilityLabel={`Abrir ${student.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}
    >
      <Card>
        <View style={styles.row}>
          <View accessibilityLabel={`Iniciais de ${student.name}`} style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(student.name)}</Text>
          </View>

          <View style={styles.copy}>
            <Text style={styles.name}>{student.name}</Text>
            <Text style={sharedStyles.subtitle}>{resolveContact(student)}</Text>
          </View>

          <StudentStatusBadge status={student.status} />
        </View>
      </Card>
    </Pressable>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'AL';
}

function resolveContact(student: TrainerStudent): string {
  return student.email || student.phone || 'Sem contato cadastrado';
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radii.lg,
  },
  pressed: {
    opacity: 0.8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.avatar,
    height: controlSizes.touchTarget,
    justifyContent: 'center',
    width: controlSizes.touchTarget,
  },
  avatarText: {
    color: colors.ink,
    ...typography.label,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.ink,
    ...typography.cardTitle,
  },
});
