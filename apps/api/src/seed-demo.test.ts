import { db, schema } from '@muvit/db';
import { demoCredentials, seedDemoData } from '@muvit/db/seed';
import { count } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../test/helpers/build.js';
import { closeDb, truncateAll } from '../test/helpers/db.js';

let app: FastifyInstance;

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

describe('demo seed', () => {
  it('cria logins simples e um cenário completo sem duplicação', async () => {
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
      students: { total: 10, active: 6, paused: 2, inactive: 2, newThisWeek: 2 },
      workouts: { activePlans: 6 },
      assessments: { last30d: 8 },
    });

    const students = await app.inject({
      method: 'GET',
      url: '/students',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(students.statusCode).toBe(200);
    expect(students.json().items).toHaveLength(10);
    expect(
      new Set(students.json().items.map((student: { email: string }) => student.email)),
    ).toEqual(new Set(demoCredentials.students.map((student) => student.email)));

    for (const student of demoCredentials.students) {
      const studentLogin = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: student.email,
          password: demoCredentials.password,
          role: 'student',
        },
      });
      expect(studentLogin.statusCode).toBe(200);
    }

    const readTotals = async () => ({
      trainers: (await db.select({ value: count() }).from(schema.trainers))[0]?.value ?? 0,
      students: (await db.select({ value: count() }).from(schema.students))[0]?.value ?? 0,
      assessments: (await db.select({ value: count() }).from(schema.assessments))[0]?.value ?? 0,
      plans: (await db.select({ value: count() }).from(schema.workoutPlans))[0]?.value ?? 0,
      logs: (await db.select({ value: count() }).from(schema.workoutLogs))[0]?.value ?? 0,
    });

    const expectedTotals = {
      trainers: 1,
      students: 10,
      assessments: 24,
      plans: 10,
      logs: 40,
    };
    expect(await readTotals()).toEqual(expectedTotals);

    await seedDemoData();

    expect(await readTotals()).toEqual(expectedTotals);
  }, 15_000);
});
