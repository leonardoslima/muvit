import { db, schema } from '@muvit/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;
let trainerToken: string;

beforeEach(async () => {
  await truncateAll();
  app = await buildTestApp();
  await db.insert(schema.exercises).values({ name: 'Supino reto', muscleGroup: 'chest' });
  await db.insert(schema.exercises).values({ name: 'Agachamento', muscleGroup: 'legs' });
  const r = await app.inject({
    method: 'POST',
    url: '/auth/signup/trainer',
    payload: { name: 'Trainer', email: 'a@a.com', password: '12345678' },
  });
  trainerToken = r.json().accessToken;
});
afterAll(async () => {
  await closeDb();
});

describe('exercises', () => {
  it('lists global exercises for any authenticated user', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/exercises?scope=global',
      headers: { authorization: `Bearer ${trainerToken}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().items.length).toBe(2);
  });

  it('trainer creates a custom exercise', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/exercises',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { name: 'Crucifixo invertido', muscleGroup: 'shoulders' },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json().trainerId).toBeDefined();
  });

  it('students cannot create exercises', async () => {
    const s = await app.inject({
      method: 'POST',
      url: '/auth/signup/student',
      payload: { name: 'Aluno', email: 's@s.com', password: '12345678' },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/exercises',
      headers: { authorization: `Bearer ${s.json().accessToken}` },
      payload: { name: 'Crucifixo invertido', muscleGroup: 'chest' },
    });
    expect(r.statusCode).toBe(403);
  });

  it('filters by muscle group', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/exercises?muscleGroup=chest&scope=global',
      headers: { authorization: `Bearer ${trainerToken}` },
    });
    const items = r.json().items as Array<{ muscleGroup: string }>;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((e) => e.muscleGroup === 'chest')).toBe(true);
  });
});
