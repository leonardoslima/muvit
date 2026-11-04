import { ArrowDown, ArrowUp, CircleDot, Dumbbell, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import type {
  WorkoutEditorDay,
  WorkoutEditorExercise,
  WorkoutEditorExerciseField,
} from '../../application/workouts/workout-editor';
import { colors } from '../../lib/design-system/tokens';
import { muscleGroupLabel } from '../../lib/muscle-groups';
import { Button, Card, ConfirmationDialog, Field, IconButton, Text } from '../ui/v2';

export type WorkoutEditorDayViewProps = {
  day: WorkoutEditorDay;
  disabled?: boolean;
  canRemoveDay?: boolean;
  dirtyExerciseIds?: string[];
  onAddExercise: () => void;
  onChangeExercise: (
    exerciseLocalId: string,
    field: WorkoutEditorExerciseField,
    value: string,
  ) => void;
  onFocusExercise?: (exerciseLocalId: string) => void;
  onMoveExercise: (exerciseLocalId: string, direction: -1 | 1) => void;
  onRemoveDay?: () => void;
  onRemoveExercise: (exerciseLocalId: string) => void;
};

export function WorkoutEditorDayView({
  day,
  disabled = false,
  canRemoveDay = false,
  dirtyExerciseIds = [],
  onAddExercise,
  onChangeExercise,
  onFocusExercise,
  onMoveExercise,
  onRemoveDay,
  onRemoveExercise,
}: WorkoutEditorDayViewProps) {
  const [removingDayId, setRemovingDayId] = useState<string>();
  const removeDay = () => {
    if (!onRemoveDay || !canRemoveDay || disabled) return;
    setRemovingDayId(day.localId);
  };
  const confirmRemoveDay = () => {
    if (removingDayId !== day.localId || !canRemoveDay || disabled) return;
    setRemovingDayId(undefined);
    onRemoveDay?.();
  };

  return (
    <>
      <Card className="gap-4 rounded-v2-session border-0">
        <View className="flex-row items-center gap-2">
          <View className="min-w-0 flex-1 gap-1">
            <Text
              accessibilityRole="header"
              variant="sectionTitle"
              className="text-[19px] leading-[26.6px]"
            >
              {day.label}
            </Text>
            <Text variant="support" className="text-v2-secondary">
              {day.exercises.length === 0
                ? 'Nenhum exercício cadastrado'
                : `${day.exercises.length} ${day.exercises.length === 1 ? 'exercício cadastrado' : 'exercícios cadastrados'}`}
            </Text>
          </View>
          <IconButton
            accessibilityLabel={`Remover ${day.label}`}
            disabled={disabled || !canRemoveDay}
            icon={
              <Trash2
                accessible={false}
                color={canRemoveDay ? colors.error : colors.secondary}
                size={22}
              />
            }
            onPress={removeDay}
            variant="text"
          />
        </View>

        <View className="h-px bg-v2-border" />

        {day.exercises.length > 0 ? (
          <View className="gap-3">
            {day.exercises.map((exercise, index) => (
              <EditorExerciseCard
                disabled={disabled}
                dirty={dirtyExerciseIds.includes(exercise.localId)}
                exercise={exercise}
                index={index}
                key={exercise.localId}
                total={day.exercises.length}
                onChangeExercise={onChangeExercise}
                onFocusExercise={onFocusExercise}
                onMoveExercise={onMoveExercise}
                onRemoveExercise={onRemoveExercise}
              />
            ))}
          </View>
        ) : null}

        <Button
          className="rounded-v2-field border-dashed"
          disabled={disabled}
          label="Adicionar exercício"
          labelClassName="flex-1 pr-6 text-[14px] leading-[19.6px]"
          leading={<Plus accessible={false} color={colors.brand} size={16} />}
          onPress={onAddExercise}
          variant="secondary"
        />
      </Card>
      <ConfirmationDialog
        visible={removingDayId === day.localId && canRemoveDay}
        disabled={disabled}
        title="Remover dia?"
        description={`O dia ${day.label} e seus exercícios serão removidos deste treino.`}
        confirmLabel="Remover dia"
        onCancel={() => setRemovingDayId(undefined)}
        onConfirm={confirmRemoveDay}
      />
    </>
  );
}

type EditorExerciseCardProps = {
  exercise: WorkoutEditorExercise;
  index: number;
  total: number;
  disabled: boolean;
  dirty: boolean;
  onChangeExercise: WorkoutEditorDayViewProps['onChangeExercise'];
  onFocusExercise?: WorkoutEditorDayViewProps['onFocusExercise'];
  onMoveExercise: WorkoutEditorDayViewProps['onMoveExercise'];
  onRemoveExercise: WorkoutEditorDayViewProps['onRemoveExercise'];
};

function EditorExerciseCard({
  disabled,
  dirty,
  exercise,
  index,
  onChangeExercise,
  onFocusExercise,
  onMoveExercise,
  onRemoveExercise,
  total,
}: EditorExerciseCardProps) {
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const change = (field: WorkoutEditorExerciseField) => (value: string) =>
    onChangeExercise(exercise.localId, field, value);
  const markFocused = () => onFocusExercise?.(exercise.localId);
  const removeExercise = () => {
    if (disabled) return;
    setConfirmingRemoval(true);
  };
  const confirmRemoveExercise = () => {
    if (disabled) return;
    setConfirmingRemoval(false);
    onRemoveExercise(exercise.localId);
  };

  return (
    <>
      <Card className={`gap-3 bg-v2-background p-3 ${dirty ? 'border-2 border-v2-warning' : ''}`}>
        <View className="flex-row items-center gap-3">
          <Dumbbell accessible={false} color={colors.brand} size={24} />
          <View className="flex-1 gap-1">
            <Text variant="label" className="text-[16px] leading-[22.4px]">
              {exercise.exerciseName}
            </Text>
            <Text variant="support" className="text-v2-secondary">
              {muscleGroupLabel(exercise.muscleGroup)} · Exercício{' '}
              {String(index + 1).padStart(2, '0')}
            </Text>
          </View>
        </View>
        {dirty ? (
          <View className="flex-row items-center gap-2">
            <CircleDot accessible={false} color={colors.warning} size={16} />
            <Text variant="label" className="text-[12px] leading-[16.8px] text-v2-warning">
              Alterações não salvas
            </Text>
          </View>
        ) : null}

        <View className="flex-row gap-3">
          <Field
            className="flex-1"
            editable={!disabled}
            keyboardType="numeric"
            label="Séries"
            onFocus={markFocused}
            onChangeText={change('sets')}
            value={exercise.sets}
          />
          <Field
            className="flex-1"
            editable={!disabled}
            label="Repetições"
            onFocus={markFocused}
            onChangeText={change('reps')}
            value={exercise.reps}
          />
        </View>

        <View className="flex-row gap-3">
          <Field
            className="flex-1"
            editable={!disabled}
            keyboardType="number-pad"
            label="Carga (kg)"
            accessibilityLabel="Carga"
            accessibilityHint="Valor em quilogramas"
            onFocus={markFocused}
            onChangeText={change('loadKg')}
            value={exercise.loadKg}
          />
          <Field
            className="flex-1"
            editable={!disabled}
            keyboardType="numeric"
            accessibilityLabel="Descanso"
            accessibilityHint="Valor em segundos"
            label="Descanso (s)"
            onFocus={markFocused}
            onChangeText={change('restSeconds')}
            value={exercise.restSeconds}
          />
        </View>

        <Field
          editable={!disabled}
          label="Observação"
          multiline
          controlClassName="min-h-[86px]"
          inputClassName="min-h-[84px]"
          textAlignVertical="center"
          onFocus={markFocused}
          onChangeText={change('notes')}
          value={exercise.notes}
        />

        <View className="flex-row flex-wrap justify-end gap-1">
          <IconButton
            accessibilityLabel={`Mover ${exercise.exerciseName} para cima`}
            disabled={disabled || index === 0}
            icon={<ArrowUp accessible={false} color={colors.brand} size={22} />}
            variant="text"
            onPress={() => onMoveExercise(exercise.localId, -1)}
          />
          <IconButton
            accessibilityLabel={`Mover ${exercise.exerciseName} para baixo`}
            disabled={disabled || index === total - 1}
            icon={<ArrowDown accessible={false} color={colors.brand} size={22} />}
            variant="text"
            onPress={() => onMoveExercise(exercise.localId, 1)}
          />
          <IconButton
            accessibilityLabel={`Remover ${exercise.exerciseName}`}
            disabled={disabled}
            icon={<Trash2 accessible={false} color={colors.error} size={22} />}
            onPress={removeExercise}
            variant="text"
          />
        </View>
      </Card>
      <ConfirmationDialog
        visible={confirmingRemoval}
        title="Remover exercício?"
        description={`O exercício ${exercise.exerciseName} será removido deste dia de treino.`}
        confirmLabel="Remover exercício"
        disabled={disabled}
        onCancel={() => setConfirmingRemoval(false)}
        onConfirm={confirmRemoveExercise}
      />
    </>
  );
}
