import { db, schema } from '@muvit/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;
let trainerToken: string;
let otherTrainerToken: string;
let studentId: string;
let exerciseA: string;
let exerciseB: string;

async function signupTrainer(email: string) {
  const r = await app.inject({
    method: 'POST',
    url: '/auth/signup/trainer',
    payload: { name: 'Trainer', email, password: '12345678' },
  });
  return r.json().accessToken as string;
}

beforeEach(async () => {
  await truncateAll();
  app = await buildTestApp();
  const [exA] = await db
    .insert(schema.exercises)
    .values({ name: 'Supino', muscleGroup: 'chest' })
    .returning();
  const [exB] = await db
    .insert(schema.exercises)
    .values({ name: 'Agacha', muscleGroup: 'legs' })
    .returning();
  exerciseA = exA.id;
  exerciseB = exB.id;
  trainerToken = await signupTrainer('a@a.com');
  otherTrainerToken = await signupTrainer('b@b.com');
  const sr = await app.inject({
    method: 'POST',
    url: '/students',
    headers: { authorization: `Bearer ${trainerToken}` },
    payload: { name: 'Aluno' },
  });
  studentId = sr.json().id;
});
afterAll(async () => {
  await closeDb();
});

describe('workout plans', () => {
  it('trainer creates a 2-day plan with exercises', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: {
        studentId,
        name: 'Hipertrofia A/B',
        status: 'active',
        days: [
          {
            label: 'Treino A',
            dayOrder: 0,
            exercises: [
              {
                exerciseId: exerciseA,
                exerciseOrder: 0,
                sets: 4,
                reps: '8-12',
                restSeconds: 90,
                loadKg: 60,
              },
            ],
          },
          {
            label: 'Treino B',
            dayOrder: 1,
            exercises: [
              { exerciseId: exerciseB, exerciseOrder: 0, sets: 3, reps: '10', restSeconds: 60 },
            ],
          },
        ],
      },
    });
    expect(r.statusCode).toBe(201);
    const body = r.json();
    expect(body.days).toHaveLength(2);
    expect(body.days[0].exercises[0].exercise.name).toBe('Supino');
  });

  it('lists plans for a student (trainer view)', async () => {
    await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: {
        studentId,
        name: 'Plano 1',
        status: 'active',
        days: [{ label: 'A', dayOrder: 0, exercises: [] }],
      },
    });
    const r = await app.inject({
      method: 'GET',
      url: `/students/${studentId}/workout-plans`,
      headers: { authorization: `Bearer ${trainerToken}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().items).toHaveLength(1);
  });

  it('cross-tenant 404: other trainer cannot list plans for our student', async () => {
    const r = await app.inject({
      method: 'GET',
      url: `/students/${studentId}/workout-plans`,
      headers: { authorization: `Bearer ${otherTrainerToken}` },
    });
    expect(r.statusCode).toBe(404);
  });

  it('independent student creates own plan (trainerId null)', async () => {
    const sign = await app.inject({
      method: 'POST',
      url: '/auth/signup/student',
      payload: { name: 'Independente', email: 'i@i.com', password: '12345678' },
    });
    const token = sign.json().accessToken;
    const myId = sign.json().user.id;
    const r = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        studentId: myId,
        name: 'Meu Treino',
        status: 'active',
        days: [
          {
            label: 'A',
            dayOrder: 0,
            exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
          },
        ],
      },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json().trainerId).toBeNull();
  });

  it('update replaces days idempotently', async () => {
    const c = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: {
        studentId,
        name: 'Plano',
        status: 'draft',
        days: [
          {
            label: 'A',
            dayOrder: 0,
            exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
          },
        ],
      },
    });
    const id = c.json().id;
    const u = await app.inject({
      method: 'PATCH',
      url: `/workout-plans/${id}`,
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: {
        name: 'Plano renomeado',
        days: [
          {
            label: 'B',
            dayOrder: 0,
            exercises: [{ exerciseId: exerciseB, exerciseOrder: 0, sets: 4, reps: '8' }],
          },
        ],
      },
    });
    expect(u.statusCode).toBe(200);
    expect(u.json().name).toBe('Plano renomeado');
    expect(u.json().days).toHaveLength(1);
    expect(u.json().days[0].label).toBe('B');
    expect(u.json().days[0].exercises[0].exercise.name).toBe('Agacha');
  });

  it('rejects empty days array with 400', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { studentId, name: 'X', status: 'draft', days: [] },
    });
    expect(r.statusCode).toBe(400);
  });
});
