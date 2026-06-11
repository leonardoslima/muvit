import { describe, expect, it } from 'vitest';
import {
  addWorkoutDay,
  addWorkoutExercise,
  buildCreateWorkoutInput,
  createWorkoutDay,
  moveWorkoutExercise,
  removeWorkoutDay,
  validateWorkoutDraft,
} from './workout-editor-model';

const exercise = { id: 'exercise-id', name: 'Supino', muscleGroup: 'chest' as const };

describe('workout editor model', () => {
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

  it('validates required plan data', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');

    expect(validateWorkoutDraft('', [day])).toEqual('Informe um nome para o treino.');
    expect(validateWorkoutDraft('Plano', [day])).toEqual(
      'Cada dia precisa ter ao menos 1 exercicio.',
    );
  });

  it('builds create workout payload', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');
    const days = addWorkoutExercise([day], 0, exercise);

    expect(
      buildCreateWorkoutInput({
        studentId: 'student-id',
        name: ' Hipertrofia ',
        notes: ' ',
        status: 'active',
        days,
      }),
    ).toEqual({
      studentId: 'student-id',
      name: 'Hipertrofia',
      notes: undefined,
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
              restSeconds: undefined,
              loadKg: undefined,
              notes: undefined,
            },
          ],
        },
      ],
    });
  });
});
