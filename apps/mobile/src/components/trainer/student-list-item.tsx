import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TrainerStudent } from '../../application/trainer/trainer-data';
import { colors, fontFamilies, radii, spacing } from '../../lib/styles';
import { StudentStatusBadge, studentStatusLabel } from './student-status-badge';

export type StudentListItemProps = {
  student: TrainerStudent;
  onPress: () => void;
};

export function StudentListItem({ onPress, student }: StudentListItemProps) {
  const contact = resolveContact(student);

  return (
    <Pressable
      accessible
      accessibilityLabel={`Abrir ${student.name}, contato: ${contact}, status: ${studentStatusLabel(student.status)}`}
      accessibilityHint="Abre os detalhes do aluno"
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.row} testID="student-list-item-row">
        <View style={styles.avatar} testID="student-list-item-avatar">
          <Text style={styles.avatarText}>{getInitials(student.name)}</Text>
        </View>

        <View style={styles.copy}>
          <View style={styles.heading}>
            <Text style={styles.name}>{student.name}</Text>
          </View>
          <Text style={styles.contact}>{contact}</Text>
        </View>

        <View style={styles.trailing}>
          <View style={styles.statusRow} testID="student-list-item-status">
            <StudentStatusBadge status={student.status} />
          </View>
          <Ionicons
            accessible={false}
            color={colors.muted}
            name="chevron-forward"
            size={18}
            testID="student-list-item-chevron"
          />
        </View>
      </View>
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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.avatar,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    color: colors.surface,
    fontFamily: fontFamilies.heading,
    fontSize: 14,
    fontWeight: '600',
  },
  copy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  name: {
    color: colors.ink,
    flex: 1,
    fontFamily: fontFamilies.heading,
    fontSize: 14,
    fontWeight: '700',
  },
  contact: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 11,
  },
  statusRow: {
    alignItems: 'flex-start',
    transform: [{ scale: 0.6 }],
    transformOrigin: 'left center',
  },
  trailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
  },
});
