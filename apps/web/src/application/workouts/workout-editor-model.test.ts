import { describe, expect, it } from 'vitest';
import {
  type WorkoutDraft,
  addWorkoutDay,
  addWorkoutExercise,
  buildCreateWorkoutInput,
  createWorkoutDraft,
  discardWorkoutDraft,
  moveWorkoutExercise,
  removeWorkoutDay,
  removeWorkoutExercise,
  updateWorkoutDayLabel,
  updateWorkoutExercise,
  validateWorkoutDraft,
} from './workout-editor-model';

const exercise = {
  id: 'exercise-id',
  name: 'Supino',
  muscleGroup: 'chest' as const,
  equipment: 'Barra',
};

function populatedDraft(): WorkoutDraft {
  const draft = createWorkoutDraft('student-id', () => 'day-a');
  return {
    ...draft,
    name: ' Hipertrofia ',
    startDate: '2026-08-10',
    endDate: '2026-09-10',
    status: 'active',
    notes: ' Progressão semanal ',
    days: updateWorkoutExercise(
      updateWorkoutExercise(
        updateWorkoutExercise(
          updateWorkoutExercise(addWorkoutExercise(draft.days, 0, exercise), 0, 0, 'loadKg', 42),
          0,
          0,
          'restSeconds',
          90,
        ),
        0,
        0,
        'tempo',
        '3-1-1',
      ),
      0,
      0,
      'notes',
      'Controlar a descida',
    ),
  };
}

describe('workout editor model', () => {
  it('cria o rascunho inicial com um dia e os metadados canônicos', () => {
    expect(createWorkoutDraft('student-id', () => 'day-a')).toEqual({
      studentId: 'student-id',
      name: '',
      startDate: '',
      endDate: '',
      status: 'draft',
      notes: '',
      days: [{ id: 'day-a', label: 'Treino A', exercises: [] }],
    });
  });

  it('adiciona dias com rótulos sequenciais até o limite de sete', () => {
    let days = createWorkoutDraft('student-id', () => 'day-a').days;
    const ids = ['day-b', 'day-c', 'day-d', 'day-e', 'day-f', 'day-g', 'day-extra'];
    let nextId = 0;

    for (const _ of ids) {
      days = addWorkoutDay(days, () => ids[nextId++] ?? 'day-fallback');
    }

    expect(days.map((day) => day.label)).toEqual([
      'Treino A',
      'Treino B',
      'Treino C',
      'Treino D',
      'Treino E',
      'Treino F',
      'Treino G',
    ]);
    expect(days).toHaveLength(7);
  });

  it('renomeia e remove dias sem alterar o original nem eliminar o último dia', () => {
    const original = addWorkoutDay(
      createWorkoutDraft('student-id', () => 'day-a').days,
      () => 'day-b',
    );
    const renamed = updateWorkoutDayLabel(original, 1, 'Inferior');

    expect(renamed[1]?.label).toBe('Inferior');
    expect(original[1]?.label).toBe('Treino B');
    const onlyDay = original.slice(0, 1);
    expect(removeWorkoutDay(renamed, 1)).toEqual(onlyDay);
    expect(removeWorkoutDay(onlyDay, 0)).toEqual(onlyDay);
  });

  it('reordena exercícios nas duas direções usadas pela alça de teclado', () => {
    const day = createWorkoutDraft('student-id', () => 'day-a').days;
    const withExercises = addWorkoutExercise(addWorkoutExercise(day, 0, exercise), 0, {
      id: 'exercise-2',
      name: 'Remada',
      muscleGroup: 'back',
      equipment: 'Halteres',
    });

    const movedUp = moveWorkoutExercise(withExercises, 0, 1, -1);
    const movedDown = moveWorkoutExercise(movedUp, 0, 0, 1);

    expect(movedUp[0]?.exercises.map((item) => item.exerciseName)).toEqual(['Remada', 'Supino']);
    expect(movedDown[0]?.exercises.map((item) => item.exerciseName)).toEqual(['Supino', 'Remada']);
    expect(moveWorkoutExercise(withExercises, 0, 0, -1)).toEqual(withExercises);
    expect(moveWorkoutExercise(withExercises, 0, 1, 1)).toEqual(withExercises);
  });

  it('atualiza notas e remove exercícios somente do dia informado', () => {
    const draft = createWorkoutDraft('student-id', () => 'day-a');
    const withExercise = addWorkoutExercise(draft.days, 0, exercise);
    const updated = updateWorkoutExercise(withExercise, 0, 0, 'notes', 'Aumentar a carga');

    expect(updated[0]?.exercises[0]?.notes).toBe('Aumentar a carga');
    expect(removeWorkoutExercise(updated, 0, 0)[0]?.exercises).toEqual([]);
  });

  it('rejeita nome vazio, dia vazio e intervalo de datas invertido', () => {
    const initial = createWorkoutDraft('student-id', () => 'day-a');

    expect(validateWorkoutDraft(initial)).toBe('Informe um nome para o treino.');
    expect(validateWorkoutDraft({ ...initial, name: 'Plano' })).toBe(
      'Cada dia precisa ter ao menos 1 exercício.',
    );
    expect(
      validateWorkoutDraft({
        ...populatedDraft(),
        startDate: '2026-09-11',
        endDate: '2026-09-10',
      }),
    ).toBe('A data final não pode ser anterior à data inicial.');
    expect(validateWorkoutDraft(populatedDraft())).toBeNull();
  });

  it('descarta alterações preservando apenas o aluno selecionado', () => {
    const discarded = discardWorkoutDraft(
      { ...populatedDraft(), studentId: 'student-current' },
      () => 'day-reset',
    );

    expect(discarded).toEqual({
      studentId: 'student-current',
      name: '',
      startDate: '',
      endDate: '',
      status: 'draft',
      notes: '',
      days: [{ id: 'day-reset', label: 'Treino A', exercises: [] }],
    });
  });

  it('monta o payload integral com datas, tempo, notas e ordens', () => {
    expect(buildCreateWorkoutInput(populatedDraft())).toEqual({
      studentId: 'student-id',
      name: 'Hipertrofia',
      startDate: '2026-08-10',
      endDate: '2026-09-10',
      status: 'active',
      notes: 'Progressão semanal',
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
              tempo: '3-1-1',
              notes: 'Controlar a descida',
            },
          ],
        },
      ],
    });
  });
});
