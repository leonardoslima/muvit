import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import type { TrainerStudent } from '../../application/trainer/trainer-data';
import { colors } from '../../lib/design-system/tokens';
import { Text } from '../ui/v2/text';
import { StudentStatusBadge } from './student-status-badge';

export type StudentListItemProps = {
  student: TrainerStudent;
  onPress: () => void;
};

export function StudentListItem({ onPress, student }: StudentListItemProps) {
  const [width, setWidth] = useState<number>();
  const handleLayout = (event: LayoutChangeEvent): void => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <Pressable
      accessible
      accessibilityLabel={`Abrir ${student.name}`}
      accessibilityRole="button"
      className="flex-row items-center gap-3 border-b border-v2-border py-4"
      onLayout={handleLayout}
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.8 } : undefined)}
    >
      <View
        accessible={false}
        className="h-12 w-12 shrink-0 items-center justify-center rounded-full bg-v2-subtle"
      >
        <Text className="font-v2-bold text-v2-brand" variant="label">
          {getInitials(student.name)}
        </Text>
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text
          className={width !== undefined && width <= 320 ? 'text-[16px]' : undefined}
          variant="action"
        >
          {student.name}
        </Text>
        <Text className="text-[13px] leading-[18px] text-v2-secondary">
          {resolveContact(student)}
        </Text>
        <StudentStatusBadge compact status={student.status} />
      </View>
      <View accessible={false} className="shrink-0">
        <ChevronRight size={20} color={colors.secondary} accessible={false} />
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
