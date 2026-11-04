import { describe, expect, it } from 'vitest';
import {
  buildSessionSummary,
  completeCurrentSet,
  continueAfterExercise,
  createGuidedSession,
  extendRest,
  getCurrentSet,
  markSessionFinished,
  pauseGuidedSession,
  resumeGuidedSession,
  skipCurrentExercise,
  skipRest,
  updateCurrentSet,
} from './guided-session';

const day = {
  id: 'day-id',
  exercises: [
    { id: 'exercise-a', sets: 2, reps: '10', loadKg: 20, restSeconds: 60 },
    { id: 'exercise-b', sets: 1, reps: '12', loadKg: null, restSeconds: 45 },
  ],
};

describe('sessão guiada', () => {
  it('soma somente os intervalos ativos separados por salvar e retomar', () => {
    const created = createGuidedSession(day, 1_000);
    const paused = pauseGuidedSession(created, 61_000);
    const resumed = resumeGuidedSession(paused, 3_661_000);

    expect(paused).toMatchObject({
      phase: 'set',
      activeDurationMs: 60_000,
      activeSinceMs: null,
    });
    expect(resumed).toMatchObject({
      phase: 'set',
      activeDurationMs: 60_000,
      activeSinceMs: 3_661_000,
    });
    expect(buildSessionSummary(resumed, 3_721_000).durationMin).toBe(2);
  });

  it('avança de série para descanso e depois para a próxima série', () => {
    const created = createGuidedSession(day, 1_000);
    const edited = updateCurrentSet(created, { loadKg: '22', repsDone: '10' }, 1_500);

    expect(edited.updatedAtMs).toBe(1_500);
    expect(created.updatedAtMs).toBe(1_000);

    const resting = completeCurrentSet(edited, day, 2_000);

    expect(resting.phase).toBe('rest');
    expect(resting.restEndsAtMs).toBe(62_000);
    expect(getCurrentSet(resting)).toMatchObject({ completed: true, loadKg: '22', repsDone: '10' });

    const extended = extendRest(resting, 2_500);
    expect(extended).toMatchObject({ restEndsAtMs: 77_000, updatedAtMs: 2_500 });

    expect(skipRest(extended, day, 3_000)).toMatchObject({
      phase: 'set',
      currentSetIndex: 1,
      restEndsAtMs: null,
      updatedAtMs: 3_000,
    });
  });

  it('exige confirmação entre exercícios e sinaliza a finalização', () => {
    let session = createGuidedSession(day, 1_000);
    session = completeCurrentSet(updateCurrentSet(session, { repsDone: '10' }, 1_500), day, 2_000);
    session = skipRest(session, day, 2_500);
    session = completeCurrentSet(updateCurrentSet(session, { repsDone: '10' }, 2_700), day, 3_000);

    expect(session).toMatchObject({ phase: 'exercise-complete', restEndsAtMs: null });
    session = continueAfterExercise(session, day, 3_500);
    expect(session).toMatchObject({
      phase: 'set',
      currentExerciseIndex: 1,
      currentSetIndex: 0,
      restEndsAtMs: null,
      updatedAtMs: 3_500,
    });
    session = completeCurrentSet(updateCurrentSet(session, { repsDone: '12' }, 3_700), day, 4_000);
    expect(session.phase).toBe('ready-to-finish');
  });

  it('marca o resumo e calcula duração e volume das séries concluídas', () => {
    let session = createGuidedSession(day, 1_000);
    session = completeCurrentSet(updateCurrentSet(session, { repsDone: '10' }, 1_500), day, 2_000);
    session = skipRest(session, day, 2_500);
    session = completeCurrentSet(
      updateCurrentSet(session, { repsDone: '10', loadKg: '22' }, 2_700),
      day,
      3_000,
    );
    session = continueAfterExercise(session, day, 3_500);
    session = completeCurrentSet(
      updateCurrentSet(session, { repsDone: '12', loadKg: '5' }, 3_700),
      day,
      4_000,
    );

    const finished = markSessionFinished(session, 61_001);

    expect(finished.phase).toBe('summary');
    expect(buildSessionSummary(finished, 61_001)).toEqual({
      durationMin: 2,
      exerciseCount: 2,
      completedSetCount: 3,
      volumeKg: 480,
    });
  });

  it('limita a duração do resumo ao máximo aceito pelo log', () => {
    const session = createGuidedSession(day, 1_000);

    expect(buildSessionSummary(session, 1_000 + 601 * 60_000).durationMin).toBe(600);
  });

  it('protege fases, índices e a imutabilidade das séries', () => {
    const created = createGuidedSession(day, 1_000);
    const before = structuredClone(created);
    const edited = updateCurrentSet(created, { repsDone: '10' }, 1_500);

    expect(created).toEqual(before);
    expect(edited).not.toBe(created);
    expect(edited.sets).not.toBe(created.sets);
    expect(edited.sets[0]).not.toBe(created.sets[0]);
    expect(edited.sets[1]).toBe(created.sets[1]);

    expect(() => updateCurrentSet({ ...created, phase: 'rest' }, {}, 1_600)).toThrow();
    expect(() => extendRest(created, 1_600)).toThrow();
    expect(() => skipRest(created, day, 1_600)).toThrow();
    expect(() => continueAfterExercise(created, day, 1_600)).toThrow();
    expect(() => markSessionFinished(created, 1_600)).toThrow();
    expect(() => getCurrentSet({ ...created, currentExerciseIndex: 99 })).toThrow();
    expect(() => getCurrentSet({ ...created, currentSetIndex: 99 })).toThrow();
  });
});

it.each(['12.5', '12,5'])('não altera nem conclui carga fracionada %s', (loadKg) => {
  const original = createGuidedSession(day, 1000);
  expect(() => updateCurrentSet(original, { loadKg }, 2000)).toThrow(
    'Carga deve ser um número inteiro',
  );
  const invalid = {
    ...original,
    sets: original.sets.map((set, index) => (index === 0 ? { ...set, loadKg } : set)),
  };
  expect(() => completeCurrentSet(invalid, day, 3000)).toThrow('Carga deve ser um número inteiro');
  expect(original.phase).toBe('set');
  expect(original.sets[0]?.completed).toBe(false);
});

describe('pular exercício na sessão atual', () => {
  const skipDay = {
    ...day,
    exercises: day.exercises.map((exercise) => ({ ...exercise, sets: 4 })),
  };

  it('pula todas as séries ainda não feitas e avança sem alterar o plano', () => {
    const original = createGuidedSession(skipDay, 1_000);
    const originalDay = structuredClone(skipDay);
    const skipped = skipCurrentExercise(original, skipDay, 2_000);
    expect(skipped).toMatchObject({
      currentExerciseIndex: 1,
      currentSetIndex: 0,
      phase: 'set',
      restEndsAtMs: null,
      updatedAtMs: 2_000,
    });
    expect(skipped.sets.slice(0, 4).every((set) => set.skipped && !set.completed)).toBe(true);
    expect(skipped.sets.map((set) => [set.workoutExerciseId, set.setNumber])).toEqual(
      original.sets.map((set) => [set.workoutExerciseId, set.setNumber]),
    );
    expect(original.sets.every((set) => !set.skipped)).toBe(true);
    expect(skipped.sets[4]).toBe(original.sets[4]);
    expect(skipDay).toEqual(originalDay);
    expect(buildSessionSummary(skipped, 2_000)).toEqual({
      durationMin: 1,
      exerciseCount: 0,
      completedSetCount: 0,
      skippedSetCount: 4,
      volumeKg: 0,
    });
  });

  it.each(['set', 'rest'] as const)(
    'preserva duas séries feitas de quatro ao pular na fase %s',
    (phase) => {
      let session = createGuidedSession(skipDay, 1_000);
      session = completeCurrentSet(
        updateCurrentSet(session, { repsDone: '10', loadKg: '22' }, 1_100),
        skipDay,
        1_200,
      );
      session = skipRest(session, skipDay, 1_300);
      session = completeCurrentSet(
        updateCurrentSet(session, { repsDone: '8', loadKg: '24' }, 1_400),
        skipDay,
        1_500,
      );
      if (phase === 'set') session = skipRest(session, skipDay, 1_600);
      const before = structuredClone(session);
      const skipped = skipCurrentExercise(session, skipDay, 2_000);
      expect(skipped.sets.slice(0, 2)).toEqual(before.sets.slice(0, 2));
      expect(skipped.sets[0]).toBe(session.sets[0]);
      expect(skipped.sets.slice(2, 4).every((set) => set.skipped && !set.completed)).toBe(true);
      expect(session).toEqual(before);
      expect(buildSessionSummary(skipped, 2_000)).toEqual({
        durationMin: 1,
        exerciseCount: 1,
        completedSetCount: 2,
        skippedSetCount: 2,
        volumeKg: 412,
      });
      const resumed = resumeGuidedSession(pauseGuidedSession(skipped, 2_100), 3_000);
      expect(resumed.sets).toEqual(skipped.sets);
      expect(getCurrentSet(resumed)).toEqual(skipped.sets[4]);
    },
  );

  it('prepara a finalização ao pular o último parcialmente realizado', () => {
    const firstSkipped = skipCurrentExercise(createGuidedSession(skipDay, 1_000), skipDay, 1_100);
    const resting = completeCurrentSet(
      updateCurrentSet(firstSkipped, { repsDone: '12', loadKg: '5' }, 1_200),
      skipDay,
      1_300,
    );
    const skipped = skipCurrentExercise(resting, skipDay, 1_400);
    expect(skipped).toMatchObject({
      currentExerciseIndex: 1,
      currentSetIndex: 3,
      phase: 'ready-to-finish',
      restEndsAtMs: null,
    });
    expect(buildSessionSummary(markSessionFinished(skipped, 1_500), 1_500)).toEqual({
      durationMin: 1,
      exerciseCount: 1,
      completedSetCount: 1,
      skippedSetCount: 7,
      volumeKg: 60,
    });
  });

  it.each(['exercise-complete', 'ready-to-finish', 'summary'] as const)(
    'rejeita a fase %s',
    (phase) => {
      const session = { ...createGuidedSession(skipDay, 1_000), phase };
      expect(() => skipCurrentExercise(session, skipDay, 2_000)).toThrow();
    },
  );
});
