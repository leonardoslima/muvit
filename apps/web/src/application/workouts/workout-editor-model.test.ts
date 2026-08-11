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
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Supino',
  muscleGroup: 'chest' as const,
  equipment: 'Barra',
};

function populatedDraft(): WorkoutDraft {
  const draft = createWorkoutDraft('00000000-0000-4000-8000-000000000001', () => 'day-a');
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
          updateWorkoutExercise(
            addWorkoutExercise(draft.days, 0, exercise, () => 'instance-a'),
            0,
            0,
            'loadKg',
            42,
          ),
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

  it('reutiliza o primeiro rótulo padrão livre após remover um dia intermediário', () => {
    const draft = createWorkoutDraft('student-id', () => 'day-a');
    const withSecond = addWorkoutDay(draft.days, () => 'day-b');
    const withThird = addWorkoutDay(withSecond, () => 'day-c');
    const withoutSecond = removeWorkoutDay(withThird, 1);
    const restored = addWorkoutDay(withoutSecond, () => 'day-b-new');

    expect(restored.map((day) => day.label)).toEqual(['Treino A', 'Treino C', 'Treino B']);
    expect(new Set(restored.map((day) => day.label)).size).toBe(3);
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
    const withExercises = addWorkoutExercise(
      addWorkoutExercise(day, 0, exercise, () => 'instance-a'),
      0,
      {
        id: '00000000-0000-4000-8000-000000000003',
        name: 'Remada',
        muscleGroup: 'back',
        equipment: 'Halteres',
      },
      () => 'instance-b',
    );

    const movedUp = moveWorkoutExercise(withExercises, 0, 1, -1);
    const movedDown = moveWorkoutExercise(movedUp, 0, 0, 1);

    expect(movedUp[0]?.exercises.map((item) => item.exerciseName)).toEqual(['Remada', 'Supino']);
    expect(movedDown[0]?.exercises.map((item) => item.exerciseName)).toEqual(['Supino', 'Remada']);
    expect(moveWorkoutExercise(withExercises, 0, 0, -1)).toEqual(withExercises);
    expect(moveWorkoutExercise(withExercises, 0, 1, 1)).toEqual(withExercises);
  });

  it('atribui IDs de instância distintos ao adicionar o mesmo exercício duas vezes', () => {
    const day = createWorkoutDraft('student-id', () => 'day-a').days;
    const withFirst = addWorkoutExercise(day, 0, exercise, () => 'instance-a');
    const withDuplicate = addWorkoutExercise(withFirst, 0, exercise, () => 'instance-b');

    expect(withDuplicate[0]?.exercises.map((item) => item.id)).toEqual([
      'instance-a',
      'instance-b',
    ]);
  });

  it('atualiza notas e remove exercícios somente do dia informado', () => {
    const draft = createWorkoutDraft('student-id', () => 'day-a');
    const withExercise = addWorkoutExercise(draft.days, 0, exercise, () => 'instance-a');
    const updated = updateWorkoutExercise(withExercise, 0, 0, 'notes', 'Aumentar a carga');

    expect(updated[0]?.exercises[0]?.notes).toBe('Aumentar a carga');
    expect(removeWorkoutExercise(updated, 0, 0)[0]?.exercises).toEqual([]);
  });

  it('rejeita nome vazio, dia vazio e intervalo de datas invertido por campo', () => {
    const initial = createWorkoutDraft('student-id', () => 'day-a');

    expect(validateWorkoutDraft(initial)).toEqual({
      success: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ path: 'name' }),
        expect.objectContaining({ path: 'days.day-a.exercises' }),
      ]),
    });
    expect(
      validateWorkoutDraft({
        ...populatedDraft(),
        startDate: '2026-09-11',
        endDate: '2026-09-10',
      }),
    ).toEqual({
      success: false,
      errors: [expect.objectContaining({ path: 'endDate' })],
    });
    expect(validateWorkoutDraft(populatedDraft())).toEqual({
      success: true,
      input: expect.objectContaining({ name: 'Hipertrofia' }),
    });
  });

  it.each([
    [
      'nome acima de 200 caracteres',
      (draft: WorkoutDraft) => ({ ...draft, name: 'a'.repeat(201) }),
      'name',
    ],
    [
      'data inicial inválida',
      (draft: WorkoutDraft) => ({ ...draft, startDate: '2026-02-30' }),
      'startDate',
    ],
    [
      'data final inválida',
      (draft: WorkoutDraft) => ({ ...draft, endDate: '2026-02-30' }),
      'endDate',
    ],
    [
      'notas gerais acima de 2000 caracteres',
      (draft: WorkoutDraft) => ({ ...draft, notes: 'a'.repeat(2001) }),
      'notes',
    ],
    ['rótulo vazio', (draft: WorkoutDraft) => withFirstDayLabel(draft, ' '), 'days.day-a.label'],
    [
      'rótulo acima de 50 caracteres',
      (draft: WorkoutDraft) => withFirstDayLabel(draft, 'a'.repeat(51)),
      'days.day-a.label',
    ],
    [
      'repetições vazias',
      (draft: WorkoutDraft) => ({
        ...draft,
        days: updateWorkoutExercise(draft.days, 0, 0, 'reps', ' '),
      }),
      'days.day-a.exercises.instance-a.reps',
    ],
    [
      'repetições acima de 20 caracteres',
      (draft: WorkoutDraft) => ({
        ...draft,
        days: updateWorkoutExercise(draft.days, 0, 0, 'reps', 'a'.repeat(21)),
      }),
      'days.day-a.exercises.instance-a.reps',
    ],
    [
      'séries fracionárias',
      (draft: WorkoutDraft) => ({
        ...draft,
        days: updateWorkoutExercise(draft.days, 0, 0, 'sets', 1.5),
      }),
      'days.day-a.exercises.instance-a.sets',
    ],
    [
      'séries abaixo do mínimo',
      (draft: WorkoutDraft) => ({
        ...draft,
        days: updateWorkoutExercise(draft.days, 0, 0, 'sets', 0),
      }),
      'days.day-a.exercises.instance-a.sets',
    ],
    [
      'séries acima do máximo',
      (draft: WorkoutDraft) => ({
        ...draft,
        days: updateWorkoutExercise(draft.days, 0, 0, 'sets', 21),
      }),
      'days.day-a.exercises.instance-a.sets',
    ],
    [
      'descanso fracionário',
      (draft: WorkoutDraft) => ({
        ...draft,
        days: updateWorkoutExercise(draft.days, 0, 0, 'restSeconds', 1.5),
      }),
      'days.day-a.exercises.instance-a.restSeconds',
    ],
    [
      'descanso negativo',
      (draft: WorkoutDraft) => ({
        ...draft,
        days: updateWorkoutExercise(draft.days, 0, 0, 'restSeconds', -1),
      }),
      'days.day-a.exercises.instance-a.restSeconds',
    ],
    [
      'descanso acima de 600',
      (draft: WorkoutDraft) => ({
        ...draft,
        days: updateWorkoutExercise(draft.days, 0, 0, 'restSeconds', 601),
      }),
      'days.day-a.exercises.instance-a.restSeconds',
    ],
    [
      'carga acima de 1000',
      (draft: WorkoutDraft) => ({
        ...draft,
        days: updateWorkoutExercise(draft.days, 0, 0, 'loadKg', 1001),
      }),
      'days.day-a.exercises.instance-a.loadKg',
    ],
    [
      'tempo acima de 10 caracteres',
      (draft: WorkoutDraft) => ({
        ...draft,
        days: updateWorkoutExercise(draft.days, 0, 0, 'tempo', 'a'.repeat(11)),
      }),
      'days.day-a.exercises.instance-a.tempo',
    ],
    [
      'notas do exercício acima de 500 caracteres',
      (draft: WorkoutDraft) => ({
        ...draft,
        days: updateWorkoutExercise(draft.days, 0, 0, 'notes', 'a'.repeat(501)),
      }),
      'days.day-a.exercises.instance-a.notes',
    ],
  ])('espelha o contrato compartilhado para %s', (_case, mutate, expectedPath) => {
    const result = validateWorkoutDraft(mutate(populatedDraft()));

    expect(result).toEqual({
      success: false,
      errors: expect.arrayContaining([expect.objectContaining({ path: expectedPath })]),
    });
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
      studentId: '00000000-0000-4000-8000-000000000001',
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
              exerciseId: '00000000-0000-4000-8000-000000000002',
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

function withFirstDayLabel(draft: WorkoutDraft, label: string): WorkoutDraft {
  const [firstDay, ...remainingDays] = draft.days;
  if (!firstDay) throw new Error('O fixture precisa de ao menos um dia.');
  return { ...draft, days: [{ ...firstDay, label }, ...remainingDays] };
}
