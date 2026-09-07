import { describe, expect, it } from 'vitest';
import type { TrainerWorkoutPlan } from './trainer-workout-data';
import {
  type WorkoutEditorState,
  addWorkoutEditorDay,
  addWorkoutEditorExercise,
  buildCreateTrainerWorkoutInput,
  buildUpdateTrainerWorkoutInput,
  createEmptyWorkoutEditorState,
  hydrateWorkoutEditorState,
  moveWorkoutEditorExercise,
  removeWorkoutEditorDay,
  removeWorkoutEditorExercise,
  updateWorkoutEditorDayLabel,
  updateWorkoutEditorExerciseField,
  updateWorkoutEditorPlanField,
} from './workout-editor';

const STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const EXERCISE_ID = '00000000-0000-0000-0000-000000000101';
const SECOND_EXERCISE_ID = '00000000-0000-0000-0000-000000000102';
const PLAN_ID = '00000000-0000-0000-0000-000000000301';
const DAY_ID = '00000000-0000-0000-0000-000000000201';
const EXERCISE_ROW_ID = '00000000-0000-0000-0000-000000000401';

function idFactory(): () => string {
  let index = 0;
  return () => `local-${++index}`;
}

function firstDay(state: WorkoutEditorState) {
  const day = state.days[0];
  if (!day) throw new Error('Expected an editor day.');
  return day;
}

function firstExercise(state: WorkoutEditorState) {
  const exercise = firstDay(state).exercises[0];
  if (!exercise) throw new Error('Expected an editor exercise.');
  return exercise;
}

function exerciseReference(id: string = EXERCISE_ID) {
  return { id, name: id === EXERCISE_ID ? 'Supino reto' : 'Remada baixa', muscleGroup: 'chest' };
}

function validEditorState(): WorkoutEditorState {
  const nextId = idFactory();
  let state = createEmptyWorkoutEditorState(nextId);
  state = updateWorkoutEditorPlanField(state, 'name', '  Hipertrofia  ');
  state = updateWorkoutEditorPlanField(state, 'notes', '  Progressão semanal  ');
  state = addWorkoutEditorExercise(state, 'local-1', exerciseReference(), nextId);
  return state;
}

function existingPlan(overrides: Partial<TrainerWorkoutPlan> = {}): TrainerWorkoutPlan {
  return {
    id: PLAN_ID,
    studentId: STUDENT_ID,
    trainerId: '00000000-0000-0000-0000-000000000901',
    name: 'Força',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    status: 'active',
    notes: 'Priorizar técnica',
    createdAt: '2026-09-06T12:00:00.000Z',
    days: [
      {
        id: DAY_ID,
        planId: PLAN_ID,
        label: 'Treino A',
        dayOrder: 0,
        exercises: [
          {
            id: EXERCISE_ROW_ID,
            workoutDayId: DAY_ID,
            exerciseId: EXERCISE_ID,
            exerciseOrder: 0,
            sets: 4,
            reps: '8-10',
            restSeconds: 90,
            loadKg: '82.50',
            tempo: '3010',
            notes: 'Sem falhar',
            exercise: {
              id: EXERCISE_ID,
              name: 'Supino reto',
              muscleGroup: 'chest',
            },
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('workout-editor', () => {
  it('inicia como rascunho com Treino A', () => {
    const nextId = idFactory();

    const state = createEmptyWorkoutEditorState(nextId);

    expect(state).toEqual({
      name: '',
      notes: '',
      status: 'draft',
      days: [
        {
          localId: 'local-1',
          label: 'Treino A',
          exercises: [],
        },
      ],
    });
  });

  it('adiciona Treino B até Treino G e bloqueia o oitavo dia', () => {
    const nextId = idFactory();
    let state = createEmptyWorkoutEditorState(nextId);

    for (let index = 0; index < 8; index += 1) {
      state = addWorkoutEditorDay(state, nextId);
    }

    expect(state.days.map((day) => day.label)).toEqual([
      'Treino A',
      'Treino B',
      'Treino C',
      'Treino D',
      'Treino E',
      'Treino F',
      'Treino G',
    ]);
  });

  it('não remove o último dia', () => {
    const nextId = idFactory();
    const state = createEmptyWorkoutEditorState(nextId);

    expect(removeWorkoutEditorDay(state, 'local-1')).toBe(state);
  });

  it('adiciona exercício com defaults e localId independente do exerciseId', () => {
    const nextId = idFactory();
    const state = createEmptyWorkoutEditorState(nextId);
    const first = addWorkoutEditorExercise(state, 'local-1', exerciseReference(), nextId);
    const second = addWorkoutEditorExercise(first, 'local-1', exerciseReference(), nextId);

    expect(firstDay(second).exercises).toEqual([
      {
        localId: 'local-2',
        exerciseId: EXERCISE_ID,
        exerciseName: 'Supino reto',
        muscleGroup: 'chest',
        sets: '3',
        reps: '10',
        loadKg: '',
        restSeconds: '',
        notes: '',
        tempo: undefined,
      },
      {
        localId: 'local-3',
        exerciseId: EXERCISE_ID,
        exerciseName: 'Supino reto',
        muscleGroup: 'chest',
        sets: '3',
        reps: '10',
        loadKg: '',
        restSeconds: '',
        notes: '',
        tempo: undefined,
      },
    ]);
  });

  it('remove, move e atualiza exercício sem mutar o estado anterior', () => {
    const nextId = idFactory();
    let state = createEmptyWorkoutEditorState(nextId);
    state = addWorkoutEditorExercise(state, 'local-1', exerciseReference(), nextId);
    state = addWorkoutEditorExercise(
      state,
      'local-1',
      exerciseReference(SECOND_EXERCISE_ID),
      nextId,
    );
    const beforeUpdate = state;

    const moved = moveWorkoutEditorExercise(state, 'local-1', 'local-2', 1);
    const updated = updateWorkoutEditorExerciseField(moved, 'local-1', 'local-2', 'reps', ' 8-12 ');
    const removed = removeWorkoutEditorExercise(updated, 'local-1', 'local-2');

    expect(firstDay(beforeUpdate).exercises[0]?.exerciseId).toBe(EXERCISE_ID);
    expect(firstDay(moved).exercises[0]?.exerciseId).toBe(SECOND_EXERCISE_ID);
    expect(firstDay(updated).exercises[1]?.reps).toBe(' 8-12 ');
    expect(firstDay(removed).exercises).toHaveLength(1);
  });

  it('não move exercício além das bordas e atualiza label do dia', () => {
    const nextId = idFactory();
    let state = createEmptyWorkoutEditorState(nextId);
    state = addWorkoutEditorExercise(state, 'local-1', exerciseReference(), nextId);
    const atTop = moveWorkoutEditorExercise(state, 'local-1', 'local-2', -1);
    const relabeled = updateWorkoutEditorDayLabel(atTop, 'local-1', '  Inferior  ');

    expect(atTop).toBe(state);
    expect(firstDay(relabeled).label).toBe('  Inferior  ');
  });

  it('hidrata plano existente, preserva opcionais e mantém tempo oculto', () => {
    const state = hydrateWorkoutEditorState(existingPlan(), idFactory());
    const exercise = firstExercise(state);

    expect(state).toMatchObject({
      name: 'Força',
      notes: 'Priorizar técnica',
      status: 'active',
    });
    expect(exercise).toMatchObject({
      sets: '4',
      reps: '8-10',
      restSeconds: '90',
      loadKg: '82.50',
      notes: 'Sem falhar',
      tempo: '3010',
    });
    expect(JSON.stringify(state)).toContain('3010');
    expect(JSON.stringify(state)).not.toContain('startDate');
    expect(JSON.stringify(state)).not.toContain('endDate');
  });

  it.each([
    ['abc', 'Carga deve ser um número válido.'],
    ['1001', 'Carga deve estar entre 0 e 1000 kg.'],
  ])('rejeita carga %s', (loadKg, message) => {
    let state = validEditorState();
    state = updateWorkoutEditorExerciseField(state, 'local-1', 'local-2', 'loadKg', loadKg);

    expect(buildCreateTrainerWorkoutInput(state, STUDENT_ID)).toEqual({ ok: false, message });
  });

  it('aceita vírgula decimal na carga e converte campos opcionais', () => {
    let state = validEditorState();
    state = updateWorkoutEditorExerciseField(state, 'local-1', 'local-2', 'loadKg', '82,5');
    state = updateWorkoutEditorExerciseField(state, 'local-1', 'local-2', 'restSeconds', '90');

    const result = buildCreateTrainerWorkoutInput(state, STUDENT_ID);

    if (!result.ok) throw new Error(result.message);
    expect(result.body.days[0]?.exercises[0]?.loadKg).toBe(82.5);
    expect(result.body.days[0]?.exercises[0]?.restSeconds).toBe(90);
  });

  it('rejeita nome, dias vazios, séries, reps, descanso e observação inválidos', () => {
    const nextId = idFactory();
    let state = createEmptyWorkoutEditorState(nextId);
    const invalidCases: Array<[WorkoutEditorState, string]> = [];

    invalidCases.push([state, 'Informe um nome para o treino.']);
    state = updateWorkoutEditorPlanField(state, 'name', 'Treino');
    invalidCases.push([state, 'Cada dia precisa ter ao menos 1 exercício.']);
    state = updateWorkoutEditorExerciseField(
      addWorkoutEditorExercise(state, 'local-1', exerciseReference(), nextId),
      'local-1',
      'local-2',
      'sets',
      '2.5',
    );
    invalidCases.push([state, 'Séries deve ser um número inteiro.']);
    state = updateWorkoutEditorExerciseField(state, 'local-1', 'local-2', 'sets', '3');
    state = updateWorkoutEditorExerciseField(state, 'local-1', 'local-2', 'reps', '');
    invalidCases.push([state, 'Repetições são obrigatórias.']);
    state = updateWorkoutEditorExerciseField(state, 'local-1', 'local-2', 'reps', '10');
    state = updateWorkoutEditorExerciseField(state, 'local-1', 'local-2', 'restSeconds', '1.5');
    invalidCases.push([state, 'Descanso deve ser um número inteiro.']);
    state = updateWorkoutEditorExerciseField(state, 'local-1', 'local-2', 'restSeconds', '90');
    state = updateWorkoutEditorExerciseField(state, 'local-1', 'local-2', 'notes', 'x'.repeat(501));
    invalidCases.push([state, 'Revise os dados do treino.']);

    for (const [candidate, message] of invalidCases) {
      expect(buildCreateTrainerWorkoutInput(candidate, STUDENT_ID)).toEqual({ ok: false, message });
    }
  });

  it('monta criação com ordens recalculadas e sem datas ou tempo', () => {
    const nextId = idFactory();
    let state = createEmptyWorkoutEditorState(nextId);
    state = updateWorkoutEditorPlanField(state, 'name', '  Hipertrofia  ');
    state = updateWorkoutEditorPlanField(state, 'notes', '  Progressão semanal  ');
    state = addWorkoutEditorExercise(state, 'local-1', exerciseReference(), nextId);
    state = addWorkoutEditorDay(state, nextId);
    const secondDay = state.days[1];
    if (!secondDay) throw new Error('Expected a second editor day.');
    state = addWorkoutEditorExercise(
      state,
      secondDay.localId,
      exerciseReference(SECOND_EXERCISE_ID),
      nextId,
    );

    const result = buildCreateTrainerWorkoutInput(state, STUDENT_ID);

    if (!result.ok) throw new Error(result.message);
    expect(result.body).toEqual({
      studentId: STUDENT_ID,
      name: 'Hipertrofia',
      notes: 'Progressão semanal',
      status: 'draft',
      days: [
        {
          label: 'Treino A',
          dayOrder: 0,
          exercises: [
            {
              exerciseId: EXERCISE_ID,
              exerciseOrder: 0,
              sets: 3,
              reps: '10',
            },
          ],
        },
        {
          label: 'Treino B',
          dayOrder: 1,
          exercises: [
            {
              exerciseId: SECOND_EXERCISE_ID,
              exerciseOrder: 0,
              sets: 3,
              reps: '10',
            },
          ],
        },
      ],
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain('startDate');
    expect(json).not.toContain('endDate');
    expect(json).not.toContain('tempo');
  });

  it('preserva tempo existente e envia notes vazio ao limpar notas do plano', () => {
    const state = hydrateWorkoutEditorState(existingPlan(), idFactory());
    const edited = updateWorkoutEditorPlanField(state, 'notes', '');

    const result = buildUpdateTrainerWorkoutInput(edited);

    if (!result.ok) throw new Error(result.message);
    expect(result.body.notes).toBe('');
    expect(result.body.days?.[0]?.exercises[0]?.tempo).toBe('3010');
    const json = JSON.stringify(result);
    expect(json).not.toContain('studentId');
    expect(json).not.toContain('startDate');
    expect(json).not.toContain('endDate');
  });

  it('não adiciona tempo ao exercício novo em payload de edição', () => {
    const nextId = idFactory();
    let state = hydrateWorkoutEditorState(existingPlan(), nextId);
    const day = firstDay(state);
    state = addWorkoutEditorExercise(
      state,
      day.localId,
      exerciseReference(SECOND_EXERCISE_ID),
      nextId,
    );

    const result = buildUpdateTrainerWorkoutInput(state);

    if (!result.ok) throw new Error(result.message);
    expect(result.body.days?.[0]?.exercises[0]?.tempo).toBe('3010');
    expect(result.body.days?.[0]?.exercises[1]).not.toHaveProperty('tempo');
  });

  it('aplica status e trim no payload de edição', () => {
    const state = hydrateWorkoutEditorState(existingPlan(), idFactory());
    let edited = updateWorkoutEditorPlanField(state, 'name', '  Força revisada  ');
    edited = updateWorkoutEditorPlanField(edited, 'status', 'draft');
    edited = updateWorkoutEditorDayLabel(edited, 'local-1', '  Treino técnico  ');
    edited = updateWorkoutEditorExerciseField(edited, 'local-1', 'local-2', 'reps', ' 8-10 ');

    const result = buildUpdateTrainerWorkoutInput(edited);

    if (!result.ok) throw new Error(result.message);
    expect(result.body.name).toBe('Força revisada');
    expect(result.body.status).toBe('draft');
    expect(result.body.days?.[0]?.label).toBe('Treino técnico');
    expect(result.body.days?.[0]?.exercises[0]?.reps).toBe('8-10');
  });
});
