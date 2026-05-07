import { db, schema } from '@muvit/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;
let studentToken: string;
let studentId: string;
let otherTrainerToken: string;
let workoutDayId: string;
let workoutExerciseId: string;

beforeEach(async () => {
  await truncateAll();
  app = await buildTestApp();
  const [ex] = await db
    .insert(schema.exercises)
    .values({ name: 'Supino', muscleGroup: 'chest' })
    .returning();
  if (!ex) throw new Error('seed failed');

  const sign = await app.inject({
    method: 'POST',
    url: '/auth/signup/student',
    payload: { name: 'Independente', email: 'i@i.com', password: '12345678' },
  });
  studentToken = sign.json().accessToken;
  studentId = sign.json().user.id;

  const otherTrainer = await app.inject({
    method: 'POST',
    url: '/auth/signup/trainer',
    payload: { name: 'Outro', email: 'b@b.com', password: '12345678' },
  });
  otherTrainerToken = otherTrainer.json().accessToken;

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
          exercises: [{ exerciseId: ex.id, exerciseOrder: 0, sets: 3, reps: '10' }],
        },
      ],
    },
  });
  workoutDayId = plan.json().days[0].id;
  workoutExerciseId = plan.json().days[0].exercises[0].id;
});

afterAll(async () => {
  await closeDb();
});

describe('workout logs', () => {
  it('student starts a log', async () => {
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

  it('starting a log for a workoutDay the student does not own returns 404', async () => {
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
