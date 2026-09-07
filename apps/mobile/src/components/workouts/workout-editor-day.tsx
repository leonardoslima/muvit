import { StyleSheet, Text, View } from 'react-native';
import type {
  WorkoutEditorDay,
  WorkoutEditorExercise,
  WorkoutEditorExerciseField,
} from '../../application/workouts/workout-editor';
import { muscleGroupLabel } from '../../lib/muscle-groups';
import { colors, sharedStyles, spacing, typography } from '../../lib/styles';
import { AppButton } from '../ui/button';
import { Card } from '../ui/card';
import { Field } from '../ui/field';

export type WorkoutEditorDayViewProps = {
  day: WorkoutEditorDay;
  disabled?: boolean;
  onChangeLabel: (value: string) => void;
  onAddExercise: () => void;
  onChangeExercise: (
    exerciseLocalId: string,
    field: WorkoutEditorExerciseField,
    value: string,
  ) => void;
  onMoveExercise: (exerciseLocalId: string, direction: -1 | 1) => void;
  onRemoveExercise: (exerciseLocalId: string) => void;
};

export function WorkoutEditorDayView({
  day,
  disabled = false,
  onAddExercise,
  onChangeExercise,
  onChangeLabel,
  onMoveExercise,
  onRemoveExercise,
}: WorkoutEditorDayViewProps) {
  return (
    <Card>
      <Field
        editable={!disabled}
        label="Nome do dia"
        onChangeText={onChangeLabel}
        value={day.label}
      />

      {day.exercises.length === 0 ? (
        <Text style={sharedStyles.subtitle}>Nenhum exercício neste dia</Text>
      ) : null}

      {day.exercises.map((exercise, index) => (
        <EditorExerciseCard
          disabled={disabled}
          exercise={exercise}
          index={index}
          key={exercise.localId}
          total={day.exercises.length}
          onChangeExercise={onChangeExercise}
          onMoveExercise={onMoveExercise}
          onRemoveExercise={onRemoveExercise}
        />
      ))}

      <AppButton disabled={disabled} label="Adicionar exercício" onPress={onAddExercise} />
    </Card>
  );
}

type EditorExerciseCardProps = {
  exercise: WorkoutEditorExercise;
  index: number;
  total: number;
  disabled: boolean;
  onChangeExercise: WorkoutEditorDayViewProps['onChangeExercise'];
  onMoveExercise: WorkoutEditorDayViewProps['onMoveExercise'];
  onRemoveExercise: WorkoutEditorDayViewProps['onRemoveExercise'];
};

function EditorExerciseCard({
  disabled,
  exercise,
  index,
  onChangeExercise,
  onMoveExercise,
  onRemoveExercise,
  total,
}: EditorExerciseCardProps) {
  const change = (field: WorkoutEditorExerciseField) => (value: string) =>
    onChangeExercise(exercise.localId, field, value);

  return (
    <Card style={styles.exerciseCard}>
      <View style={styles.exerciseHeading}>
        <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
        <Text style={sharedStyles.subtitle}>{muscleGroupLabel(exercise.muscleGroup)}</Text>
      </View>

      <Field
        editable={!disabled}
        keyboardType="numeric"
        label="Séries"
        onChangeText={change('sets')}
        value={exercise.sets}
      />
      <Field
        editable={!disabled}
        label="Repetições"
        onChangeText={change('reps')}
        value={exercise.reps}
      />
      <Field
        editable={!disabled}
        keyboardType="decimal-pad"
        label="Carga"
        onChangeText={change('loadKg')}
        unit="kg"
        value={exercise.loadKg}
      />
      <Field
        editable={!disabled}
        keyboardType="numeric"
        label="Descanso"
        onChangeText={change('restSeconds')}
        unit="s"
        value={exercise.restSeconds}
      />
      <Field
        editable={!disabled}
        label="Observação"
        multiline
        onChangeText={change('notes')}
        value={exercise.notes}
      />

      <View style={styles.actions}>
        <AppButton
          disabled={disabled || index === 0}
          label={`Mover ${exercise.exerciseName} para cima`}
          onPress={() => onMoveExercise(exercise.localId, -1)}
          variant="secondary"
        />
        <AppButton
          disabled={disabled || index === total - 1}
          label={`Mover ${exercise.exerciseName} para baixo`}
          onPress={() => onMoveExercise(exercise.localId, 1)}
          variant="secondary"
        />
        <AppButton
          disabled={disabled}
          label={`Remover ${exercise.exerciseName}`}
          onPress={() => onRemoveExercise(exercise.localId)}
          variant="secondary"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  exerciseCard: {
    backgroundColor: colors.background,
  },
  exerciseHeading: {
    gap: spacing.xs,
  },
  exerciseName: {
    color: colors.ink,
    ...typography.cardTitle,
  },
  actions: {
    gap: spacing.sm,
  },
});
