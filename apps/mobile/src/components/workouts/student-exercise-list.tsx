import { useNavigation } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import type * as React from 'react';
import { AccessibilityInfo, Pressable, View, findNodeHandle } from 'react-native';
import type { WorkoutDay } from '../../application/workouts/today-workout';
import {
  colors,
  controlSizes,
  fontFamilies,
  penTokens,
  spacing,
} from '../../lib/design-system/tokens';
import { muscleGroupLabel } from '../../lib/muscle-groups';
import { Card } from '../ui/v2/card';
import { Text } from '../ui/v2/text';

export type StudentExerciseListProps = {
  day: WorkoutDay;
  variant: 'preview' | 'detailed';
  onExercisePress: (exerciseId: string) => void;
};

export function StudentExerciseList({
  day,
  onExercisePress,
  variant,
}: StudentExerciseListProps): React.JSX.Element {
  const navigation = useNavigation();
  const selectedRow = useRef<{ dayId: string; exerciseId: string } | null>(null);
  const rowRefs = useRef(new Map<string, View>());

  useEffect(() => {
    const restoreSelectedRowFocus = () => {
      const selected = selectedRow.current;
      if (selected?.dayId !== day.id) return;
      const row = rowRefs.current.get(selected.exerciseId);
      const node = row ? findNodeHandle(row) : null;
      if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
    };
    return navigation.addListener?.('focus', restoreSelectedRowFocus);
  }, [day.id, navigation]);

  return (
    <Card
      className={`gap-0 overflow-hidden p-0 ${variant === 'preview' ? 'border-0' : ''}`}
      style={variant === 'preview' ? styles.previewCard : undefined}
    >
      {day.exercises.map((item, index) => {
        const group = muscleGroupLabel(item.exercise.muscleGroup);
        const actionLabel = 'Ver detalhes';
        const accessibilityLabel = `${actionLabel} de ${item.exercise.name}, ${group}`;

        return (
          <Pressable
            accessible
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            key={item.id}
            onPress={() => {
              selectedRow.current = { dayId: day.id, exerciseId: item.id };
              onExercisePress(item.id);
            }}
            ref={(node) => {
              if (node) rowRefs.current.set(item.id, node);
              else rowRefs.current.delete(item.id);
            }}
            style={[
              styles.row,
              variant === 'detailed' && styles.detailedRow,
              index < day.exercises.length - 1 && styles.divider,
              variant === 'preview' && styles.previewRow,
            ]}
          >
            <Text
              variant="caption"
              style={[styles.number, variant === 'preview' && styles.previewNumber]}
            >
              {String(index + 1).padStart(2, '0')}
            </Text>
            <View style={styles.exerciseContent}>
              <Text
                variant="label"
                style={[styles.exerciseName, variant === 'preview' && styles.previewName]}
              >
                {item.exercise.name}
              </Text>
              {variant === 'detailed' ? (
                <>
                  <Text style={styles.supportingText}>
                    {item.sets} séries · {item.reps} repetições
                  </Text>
                  <Text style={styles.supportingText}>Descanso: {item.restSeconds ?? 0} s</Text>
                  <Text style={styles.supportingText}>{group}</Text>
                  <Text variant="caption" style={styles.actionText}>
                    {actionLabel}
                  </Text>
                </>
              ) : null}
            </View>
            <ChevronRight
              size={variant === 'preview' ? controlSizes.icon - spacing.xs : controlSizes.icon}
              color={colors.brand}
              accessible={false}
            />
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = {
  previewCard: {
    paddingHorizontal: spacing.lg,
  },
  previewRow: {
    borderBottomColor: colors.subtle,
    minHeight: controlSizes.touch + spacing.md,
    paddingHorizontal: spacing.none,
    paddingVertical: spacing.xl,
  },
  previewNumber: {
    fontFamily: fontFamilies.semibold,
    fontSize: penTokens['font/size/12'],
    minWidth: spacing.xl,
  },
  previewName: {
    fontFamily: fontFamilies.semibold,
    fontSize: penTokens['font/size/15'],
  },
  row: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: spacing.md,
    minHeight: controlSizes.touch,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  detailedRow: {
    alignItems: 'flex-start' as const,
    paddingVertical: spacing.lg,
  },
  divider: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  number: {
    color: colors.secondary,
    minWidth: spacing.xxl,
  },
  exerciseContent: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  exerciseName: {
    color: colors.text,
  },
  supportingText: {
    color: colors.secondary,
  },
  actionText: {
    color: colors.brand,
    marginTop: spacing.xs,
  },
};
