import { db, schema } from '@muvit/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;

async function createStudentWorkoutScenario() {
  const [exercise] = await db
    .insert(schema.exercises)
    .values({ name: 'Supino', muscleGroup: 'chest' })
    .returning();
  if (!exercise) throw new Error('exercise seed failed');

  const sign = await app.inject({
    method: 'POST',
    url: '/auth/signup/student',
    payload: { name: 'Independente', email: 'i@i.com', password: '12345678' },
  });
  const studentToken = sign.json().accessToken as string;
  const studentId = sign.json().user.id as string;

  const plan = await app.inject({
    method: 'POST',
    url: '/workout-plans',
    headers: { authorization: `Bearer ${studentToken}` },
    payload: {
      studentId,
      name: 'Plano',
      status: 'active',
      days: [
        {
          label: 'A',
          dayOrder: 0,
          exercises: [{ exerciseId: exercise.id, exerciseOrder: 0, sets: 3, reps: '10' }],
        },
      ],
    },
  });

  return {
    studentId,
    studentToken,
    workoutDayId: plan.json().days[0].id as string,
    workoutExerciseId: plan.json().days[0].exercises[0].id as string,
  };
}

async function signupTrainer(email: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/signup/trainer',
    payload: { name: 'Outro', email, password: '12345678' },
  });
  return response.json().accessToken as string;
}

beforeEach(async () => {
  app = await buildTestApp();
  await truncateAll();
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  await closeDb();
});

describe('workout logs', () => {
  it('student starts a log', async () => {
    const { studentToken, workoutDayId } = await createStudentWorkoutScenario();

    const r = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json().id).toBeDefined();
    expect(r.json().completed).toBe(false);
  });

  it('student finishes the log with sets', async () => {
    const { studentToken, workoutDayId, workoutExerciseId } = await createStudentWorkoutScenario();

    const start = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    const id = start.json().id;
    const r = await app.inject({
      method: 'PATCH',
      url: `/workout-logs/${id}/finish`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        durationMin: 55,
        rpe: 8,
        sets: [
          { workoutExerciseId, setNumber: 1, repsDone: 10, loadKg: 60, completed: true },
          { workoutExerciseId, setNumber: 2, repsDone: 9, loadKg: 60, completed: true },
          { workoutExerciseId, setNumber: 3, repsDone: 8, loadKg: 60, completed: true },
        ],
      },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().completed).toBe(true);
    expect(r.json().sets).toHaveLength(3);
  });

  it('other trainer cannot read independent student logs (404)', async () => {
    const { studentToken, workoutDayId } = await createStudentWorkoutScenario();
    const otherTrainerToken = await signupTrainer('b@b.com');

    const start = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    const id = start.json().id;
    const r = await app.inject({
      method: 'GET',
      url: `/workout-logs/${id}`,
      headers: { authorization: `Bearer ${otherTrainerToken}` },
    });
    expect(r.statusCode).toBe(404);
  });

  it('lists logs by date range', async () => {
    const { studentId, studentToken, workoutDayId } = await createStudentWorkoutScenario();

    for (const date of ['2026-01-15', '2026-02-20', '2026-03-10']) {
      await app.inject({
        method: 'POST',
        url: '/workout-logs',
        headers: { authorization: `Bearer ${studentToken}` },
        payload: { workoutDayId, date },
      });
    }
    const r = await app.inject({
      method: 'GET',
      url: `/students/${studentId}/workout-logs?from=2026-02-01&to=2026-03-31`,
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(r.json().items).toHaveLength(2);
  });

  it('completed log cannot be finished again (409)', async () => {
    const { studentToken, workoutDayId, workoutExerciseId } = await createStudentWorkoutScenario();

    const start = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    const id = start.json().id;
    await app.inject({
      method: 'PATCH',
      url: `/workout-logs/${id}/finish`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        durationMin: 30,
        sets: [{ workoutExerciseId, setNumber: 1, repsDone: 8, loadKg: 50, completed: true }],
      },
    });
    const second = await app.inject({
      method: 'PATCH',
      url: `/workout-logs/${id}/finish`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        durationMin: 30,
        sets: [{ workoutExerciseId, setNumber: 1, repsDone: 8, loadKg: 50, completed: true }],
      },
    });
    expect(second.statusCode).toBe(409);
  });

  it('concurrent finishes resolve to exactly one success and one 409', async () => {
    const { studentToken, workoutDayId, workoutExerciseId } = await createStudentWorkoutScenario();

    const start = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    const id = start.json().id;
    const finish = () =>
      app.inject({
        method: 'PATCH',
        url: `/workout-logs/${id}/finish`,
        headers: { authorization: `Bearer ${studentToken}` },
        payload: {
          durationMin: 30,
          sets: [{ workoutExerciseId, setNumber: 1, repsDone: 8, loadKg: 50, completed: true }],
        },
      });
    const [a, b] = await Promise.all([finish(), finish()]);
    const codes = [a.statusCode, b.statusCode].sort();
    expect(codes).toEqual([200, 409]);

    // Verify only one set of sets was inserted (not duplicated by the loser)
    const get = await app.inject({
      method: 'GET',
      url: `/workout-logs/${id}`,
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(get.json().sets).toHaveLength(1);
  });

  it('starting a log for a workoutDay the student does not own returns 404', async () => {
    const { workoutDayId } = await createStudentWorkoutScenario();

    const sign = await app.inject({
      method: 'POST',
      url: '/auth/signup/student',
      payload: { name: 'Outro', email: 'o@o.com', password: '12345678' },
    });
    const otherToken = sign.json().accessToken;
    const r = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    expect(r.statusCode).toBe(404);
  });
});
