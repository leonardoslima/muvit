import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, type TextInput, View } from 'react-native';
import type {
  WorkoutEditorDay,
  WorkoutEditorExercise,
  WorkoutEditorExerciseField,
} from '../../application/workouts/workout-editor';
import { muscleGroupLabel } from '../../lib/muscle-groups';
import { Button, Card, Field, IconButton, Text } from '../ui/v2';

export type WorkoutEditorDayViewProps = {
  day: WorkoutEditorDay;
  disabled?: boolean;
  canRemoveDay?: boolean;
  dirtyExerciseIds?: string[];
  focusedExerciseId?: string;
  onChangeLabel: (value: string) => void;
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
  focusedExerciseId,
  onAddExercise,
  onChangeExercise,
  onChangeLabel,
  onFocusExercise,
  onMoveExercise,
  onRemoveDay,
  onRemoveExercise,
}: WorkoutEditorDayViewProps) {
  const [localFocusedExerciseId, setLocalFocusedExerciseId] = useState<string | undefined>();
  const removeDay = () => {
    if (!onRemoveDay || !canRemoveDay || disabled) return;
    if (day.exercises.length === 0) {
      onRemoveDay();
      return;
    }

    Alert.alert(
      'Remover dia?',
      `O dia ${day.label} e seus exercícios serão removidos deste treino.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: onRemoveDay },
      ],
    );
  };

  return (
    <Card className="gap-4">
      <View className="flex-row items-end gap-2">
        <Field
          className="flex-1"
          editable={!disabled}
          label="Nome do dia"
          onChangeText={onChangeLabel}
          value={day.label}
        />
        <IconButton
          accessibilityLabel={`Remover ${day.label}`}
          disabled={disabled || !canRemoveDay}
          icon={<Trash2 accessible={false} size={20} />}
          onPress={removeDay}
          variant="destructive"
        />
      </View>

      {day.exercises.length === 0 ? (
        <Text variant="support" className="text-v2-secondary">
          Nenhum exercício neste dia
        </Text>
      ) : null}

      {day.exercises.map((exercise, index) => (
        <EditorExerciseCard
          disabled={disabled}
          dirty={dirtyExerciseIds.includes(exercise.localId)}
          exercise={exercise}
          focused={
            focusedExerciseId === exercise.localId || localFocusedExerciseId === exercise.localId
          }
          index={index}
          key={exercise.localId}
          total={day.exercises.length}
          onChangeExercise={onChangeExercise}
          onFocusExercise={(exerciseLocalId) => {
            setLocalFocusedExerciseId(exerciseLocalId);
            onFocusExercise?.(exerciseLocalId);
          }}
          onMoveExercise={onMoveExercise}
          onRemoveExercise={onRemoveExercise}
        />
      ))}

      <Button
        className="self-start"
        disabled={disabled}
        label="Adicionar exercício"
        onPress={onAddExercise}
        variant="secondary"
      />
    </Card>
  );
}

type EditorExerciseCardProps = {
  exercise: WorkoutEditorExercise;
  index: number;
  total: number;
  disabled: boolean;
  dirty: boolean;
  focused: boolean;
  onChangeExercise: WorkoutEditorDayViewProps['onChangeExercise'];
  onFocusExercise?: WorkoutEditorDayViewProps['onFocusExercise'];
  onMoveExercise: WorkoutEditorDayViewProps['onMoveExercise'];
  onRemoveExercise: WorkoutEditorDayViewProps['onRemoveExercise'];
};

function EditorExerciseCard({
  disabled,
  dirty,
  exercise,
  focused,
  index,
  onChangeExercise,
  onFocusExercise,
  onMoveExercise,
  onRemoveExercise,
  total,
}: EditorExerciseCardProps) {
  const setsFieldRef = useRef<TextInput>(null);
  const change = (field: WorkoutEditorExerciseField) => (value: string) =>
    onChangeExercise(exercise.localId, field, value);
  const focusExercise = () => {
    onFocusExercise?.(exercise.localId);
    setsFieldRef.current?.focus();
  };

  return (
    <Card
      className={`gap-4 bg-v2-background ${dirty ? 'border-v2-warning' : focused ? 'border-v2-brand' : ''}`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text variant="action">{exercise.exerciseName}</Text>
          <Text variant="support" className="text-v2-secondary">
            {muscleGroupLabel(exercise.muscleGroup)}
          </Text>
          {dirty ? (
            <Text variant="caption" className="text-v2-warning">
              Alterações não salvas
            </Text>
          ) : focused ? (
            <Text variant="caption" className="text-v2-brand">
              Editando exercício
            </Text>
          ) : null}
        </View>
        <IconButton
          accessibilityLabel={`Editar exercício ${exercise.exerciseName}`}
          disabled={disabled}
          icon={<Pencil accessible={false} size={20} />}
          onPress={focusExercise}
        />
      </View>

      <View className="flex-row gap-3">
        <Field
          ref={setsFieldRef}
          className="flex-1"
          editable={!disabled}
          keyboardType="numeric"
          label="Séries"
          onChangeText={change('sets')}
          value={exercise.sets}
        />
        <Field
          className="flex-1"
          editable={!disabled}
          label="Repetições"
          onChangeText={change('reps')}
          value={exercise.reps}
        />
      </View>

      <View className="flex-row gap-3">
        <Field
          className="flex-1"
          editable={!disabled}
          keyboardType="decimal-pad"
          label="Carga"
          onChangeText={change('loadKg')}
          unit="kg"
          value={exercise.loadKg}
        />
        <Field
          className="flex-1"
          editable={!disabled}
          keyboardType="numeric"
          label="Descanso"
          onChangeText={change('restSeconds')}
          unit="s"
          value={exercise.restSeconds}
        />
      </View>

      <Field
        editable={!disabled}
        label="Observação"
        multiline
        onChangeText={change('notes')}
        value={exercise.notes}
      />

      <View className="flex-row flex-wrap gap-2">
        <IconButton
          accessibilityLabel={`Mover ${exercise.exerciseName} para cima`}
          disabled={disabled || index === 0}
          icon={<ArrowUp accessible={false} size={20} />}
          onPress={() => onMoveExercise(exercise.localId, -1)}
        />
        <IconButton
          accessibilityLabel={`Mover ${exercise.exerciseName} para baixo`}
          disabled={disabled || index === total - 1}
          icon={<ArrowDown accessible={false} size={20} />}
          onPress={() => onMoveExercise(exercise.localId, 1)}
        />
        <IconButton
          accessibilityLabel={`Remover ${exercise.exerciseName}`}
          disabled={disabled}
          icon={<Trash2 accessible={false} size={20} />}
          onPress={() => onRemoveExercise(exercise.localId)}
          variant="destructive"
        />
      </View>
    </Card>
  );
}
