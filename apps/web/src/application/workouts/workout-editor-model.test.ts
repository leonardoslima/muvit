import { describe, expect, it } from 'vitest';
import {
  addWorkoutDay,
  addWorkoutExercise,
  buildCreateWorkoutInput,
  createWorkoutDay,
  moveWorkoutExercise,
  removeWorkoutDay,
  removeWorkoutExercise,
  updateWorkoutDayLabel,
  updateWorkoutExercise,
  validateWorkoutDraft,
} from './workout-editor-model';

const exercise = { id: 'exercise-id', name: 'Supino', muscleGroup: 'chest' as const };

describe('workout editor model', () => {
  it('adds the next default day label', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');

    expect(addWorkoutDay([day], () => 'day-b')).toEqual([
      day,
      { id: 'day-b', label: 'Treino B', exercises: [] },
    ]);
  });

  it('adds days until the seven-day limit', () => {
    const ids = Array.from({ length: 8 }, (_, index) => `day-${index}`);
    let index = 0;
    const nextId = () => ids[index++] ?? 'extra';
    const days = Array.from({ length: 7 }, (_, dayIndex) =>
      createWorkoutDay(`Treino ${dayIndex + 1}`, nextId),
    );

    expect(addWorkoutDay(days, nextId)).toHaveLength(7);
  });

  it('does not remove the last remaining day', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');

    expect(removeWorkoutDay([day], 0)).toEqual([day]);
  });

  it('removes a day and updates labels immutably', () => {
    const dayA = createWorkoutDay('Treino A', () => 'day-a');
    const dayB = createWorkoutDay('Treino B', () => 'day-b');

    expect(removeWorkoutDay([dayA, dayB], 0)).toEqual([dayB]);
    expect(updateWorkoutDayLabel([dayA], 0, 'Inferior')).toEqual([{ ...dayA, label: 'Inferior' }]);
  });

  it('adds and moves exercises inside a day', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');
    const withFirst = addWorkoutExercise([day], 0, exercise);
    const withSecond = addWorkoutExercise(withFirst, 0, {
      id: 'second-id',
      name: 'Remada',
      muscleGroup: 'back',
    });

    const moved = moveWorkoutExercise(withSecond, 0, 1, -1);

    expect(moved[0]?.exercises.map((item) => item.exerciseName)).toEqual(['Remada', 'Supino']);
  });

  it('ignores exercise moves outside the day bounds', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');
    const days = addWorkoutExercise([day], 0, exercise);

    expect(moveWorkoutExercise(days, 0, 0, -1)).toEqual(days);
    expect(moveWorkoutExercise(days, 0, 0, 1)).toEqual(days);
  });

  it('removes and updates exercises inside a day', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');
    const withExercise = addWorkoutExercise([day], 0, exercise);
    const updated = updateWorkoutExercise(withExercise, 0, 0, 'notes', 'Aumentar carga');

    expect(updated[0]?.exercises[0]?.notes).toBe('Aumentar carga');
    expect(removeWorkoutExercise(updated, 0, 0)[0]?.exercises).toEqual([]);
  });

  it('validates required plan data', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');

    expect(validateWorkoutDraft('', [day])).toEqual('Informe um nome para o treino.');
    expect(validateWorkoutDraft('Plano', [day])).toEqual(
      'Cada dia precisa ter ao menos 1 exercicio.',
    );
    expect(validateWorkoutDraft('Plano', addWorkoutExercise([day], 0, exercise))).toBeNull();
  });

  it('builds create workout payload', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');
    const days = updateWorkoutExercise(
      updateWorkoutExercise(addWorkoutExercise([day], 0, exercise), 0, 0, 'loadKg', 42),
      0,
      0,
      'restSeconds',
      90,
    );

    expect(
      buildCreateWorkoutInput({
        studentId: 'student-id',
        name: ' Hipertrofia ',
        notes: ' Progressao semanal ',
        status: 'active',
        days,
      }),
    ).toEqual({
      studentId: 'student-id',
      name: 'Hipertrofia',
      notes: 'Progressao semanal',
      status: 'active',
      days: [
        {
          label: 'Treino A',
          dayOrder: 0,
          exercises: [
            {
              exerciseId: 'exercise-id',
              exerciseOrder: 0,
              sets: 3,
              reps: '10',
              restSeconds: 90,
              loadKg: 42,
              notes: undefined,
            },
          ],
        },
      ],
    });
  });
});
