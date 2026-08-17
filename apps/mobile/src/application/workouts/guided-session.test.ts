import { describe, expect, it } from 'vitest';
import {
  buildSessionSummary,
  completeCurrentSet,
  continueAfterExercise,
  createGuidedSession,
  extendRest,
  getCurrentSet,
  markSessionFinished,
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
