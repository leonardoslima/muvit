import { seedDemoData } from '@muvit/db/seed';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../test/helpers/build.js';
import { closeDb, truncateAll } from '../test/helpers/db.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

describe('demo seed', () => {
  it('creates easy login credentials and dashboard data', async () => {
    await seedDemoData();

    const trainerLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'trainer@muvit.dev',
        password: '12345678',
        role: 'trainer',
      },
    });
    expect(trainerLogin.statusCode).toBe(200);

    const { accessToken } = trainerLogin.json();
    const summary = await app.inject({
      method: 'GET',
      url: '/trainer/summary',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(summary.statusCode).toBe(200);
    expect(summary.json()).toMatchObject({
      students: { total: 3, active: 1, paused: 1, inactive: 1 },
      workouts: { activePlans: 1 },
      assessments: { last30d: 1 },
    });

    const students = await app.inject({
      method: 'GET',
      url: '/students',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(students.statusCode).toBe(200);
    expect(students.json().items.map((student: { email: string }) => student.email)).toEqual([
      'alice.aluna@muvit.dev',
      'bruno.aluno@muvit.dev',
      'carla.aluna@muvit.dev',
    ]);

    const studentLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'alice.aluna@muvit.dev',
        password: '12345678',
        role: 'student',
      },
    });
    expect(studentLogin.statusCode).toBe(200);
  });
});
