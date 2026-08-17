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
    const edited = updateCurrentSet(created, { loadKg: '22', repsDone: '10' });
    const resting = completeCurrentSet(edited, day, 2_000);

    expect(resting.phase).toBe('rest');
    expect(resting.restEndsAtMs).toBe(62_000);
    expect(getCurrentSet(resting)).toMatchObject({ completed: true, loadKg: '22', repsDone: '10' });

    expect(extendRest(resting).restEndsAtMs).toBe(77_000);
    expect(skipRest(resting, day)).toMatchObject({ phase: 'set', currentSetIndex: 1 });
  });

  it('exige confirmação entre exercícios e sinaliza a finalização', () => {
    let session = createGuidedSession(day, 1_000);
    session = completeCurrentSet(updateCurrentSet(session, { repsDone: '10' }), day, 2_000);
    session = skipRest(session, day);
    session = completeCurrentSet(updateCurrentSet(session, { repsDone: '10' }), day, 3_000);

    expect(session.phase).toBe('exercise-complete');
    session = continueAfterExercise(session, day);
    session = completeCurrentSet(updateCurrentSet(session, { repsDone: '12' }), day, 4_000);
    expect(session.phase).toBe('ready-to-finish');
  });

  it('marca o resumo e calcula duração e volume das séries concluídas', () => {
    let session = createGuidedSession(day, 1_000);
    session = completeCurrentSet(updateCurrentSet(session, { repsDone: '10' }), day, 2_000);
    session = skipRest(session, day);
    session = completeCurrentSet(
      updateCurrentSet(session, { repsDone: '10', loadKg: '22' }),
      day,
      3_000,
    );
    session = continueAfterExercise(session, day);
    session = completeCurrentSet(
      updateCurrentSet(session, { repsDone: '12', loadKg: '5' }),
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
});
