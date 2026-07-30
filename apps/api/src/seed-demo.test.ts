import { db, schema } from '@muvit/db';
import { and, count, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cookieHeaderFromSetCookie } from '../test/helpers/auth.js';
import { buildTestApp } from '../test/helpers/build.js';
import { closeDb, truncateAll } from '../test/helpers/db.js';
import { demoCredentials, seedDemo } from './seed-demo.js';

const referenceDate = new Date();

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
async function readStableIds() {
  const trainerIdentity = await db.query.authUsers.findFirst({
    where: eq(schema.authUsers.email, demoCredentials.trainer.email),
  });
  const independentIdentity = await db.query.authUsers.findFirst({
    where: eq(schema.authUsers.email, demoCredentials.independentStudent.email),
  });
  if (trainerIdentity === undefined || independentIdentity === undefined) {
    throw new Error('Identidades demo ausentes');
  }

  const trainer = await db.query.trainers.findFirst({
    where: eq(schema.trainers.authUserId, trainerIdentity.id),
  });
  const independentStudent = await db.query.students.findFirst({
    where: eq(schema.students.authUserId, independentIdentity.id),
  });
  if (trainer === undefined || independentStudent === undefined) {
    throw new Error('Perfis demo ausentes');
  }

  return {
    trainerAuthUserId: trainerIdentity.id,
    trainerProfileId: trainer.id,
    independentAuthUserId: independentIdentity.id,
    independentProfileId: independentStudent.id,
  };
}

async function readDatabaseSnapshot() {
  const [authUsers, authAccounts, trainers, students, assessments, plans, logs] = await Promise.all(
    [
      db.select({ id: schema.authUsers.id }).from(schema.authUsers),
      db.select({ id: schema.authAccounts.id }).from(schema.authAccounts),
      db.select({ id: schema.trainers.id }).from(schema.trainers),
      db.select({ id: schema.students.id }).from(schema.students),
      db.select({ id: schema.assessments.id }).from(schema.assessments),
      db.select({ id: schema.workoutPlans.id }).from(schema.workoutPlans),
      db.select({ id: schema.workoutLogs.id }).from(schema.workoutLogs),
    ],
  );

  const sortedIds = (rows: { id: string }[]): string[] => rows.map(({ id }) => id).sort();

  return {
    ids: {
      authUsers: sortedIds(authUsers),
      authAccounts: sortedIds(authAccounts),
      trainers: sortedIds(trainers),
      students: sortedIds(students),
      assessments: sortedIds(assessments),
      plans: sortedIds(plans),
      logs: sortedIds(logs),
    },
    totals: {
      authUsers: authUsers.length,
      authAccounts: authAccounts.length,
      trainers: trainers.length,
      students: students.length,
      assessments: assessments.length,
      plans: plans.length,
      logs: logs.length,
    },
  };
}
describe('demo seed', () => {
  it('cria duas identidades Better Auth e preserva domínio e IDs no rerun', async () => {
    await seedDemo(app.auth, referenceDate);

    const trainerLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: {
        email: demoCredentials.trainer.email,
        password: demoCredentials.password,
      },
    });
    expect(trainerLogin.statusCode).toBe(200);
    const trainerCookie = cookieHeaderFromSetCookie(trainerLogin.headers['set-cookie']);
    expect(trainerCookie).not.toBe('');
    const summary = await app.inject({
      method: 'GET',
      url: '/trainer/summary',
      headers: { cookie: trainerCookie },
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
      headers: { cookie: trainerCookie },
    });
    expect(students.statusCode).toBe(200);
    expect(students.json().items).toHaveLength(10);

    const readTotals = async () => ({
      authUsers: (await db.select({ value: count() }).from(schema.authUsers))[0]?.value ?? 0,
      authAccounts: (await db.select({ value: count() }).from(schema.authAccounts))[0]?.value ?? 0,
      trainers: (await db.select({ value: count() }).from(schema.trainers))[0]?.value ?? 0,
      students: (await db.select({ value: count() }).from(schema.students))[0]?.value ?? 0,
      assessments: (await db.select({ value: count() }).from(schema.assessments))[0]?.value ?? 0,
      plans: (await db.select({ value: count() }).from(schema.workoutPlans))[0]?.value ?? 0,
      logs: (await db.select({ value: count() }).from(schema.workoutLogs))[0]?.value ?? 0,
    });

    const expectedTotals = {
      authUsers: 2,
      authAccounts: 2,
      trainers: 1,
      students: 11,
      assessments: 24,
      plans: 11,
      logs: 41,
    };
    expect(await readTotals()).toEqual(expectedTotals);
    const firstIds = await readStableIds();
    const managedStudents = await db
      .select()
      .from(schema.students)
      .where(
        and(
          eq(schema.students.trainerId, firstIds.trainerProfileId),
          isNull(schema.students.authUserId),
        ),
      );
    const independentStudent = await db.query.students.findFirst({
      where: eq(schema.students.id, firstIds.independentProfileId),
    });

    expect(managedStudents).toHaveLength(10);
    expect(managedStudents.filter((student) => student.status === 'active')).toHaveLength(6);
    expect(managedStudents.filter((student) => student.status === 'paused')).toHaveLength(2);
    expect(managedStudents.filter((student) => student.status === 'inactive')).toHaveLength(2);
    expect(managedStudents.every((student) => !student.isIndependent)).toBe(true);
    expect(independentStudent).toMatchObject({
      authUserId: firstIds.independentAuthUserId,
      trainerId: null,
      isIndependent: true,
      email: demoCredentials.independentStudent.email,
    });

    const independentLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: {
        email: demoCredentials.independentStudent.email,
        password: demoCredentials.password,
      },
    });
    expect(independentLogin.statusCode).toBe(200);

    const managedLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: 'aluno01@muvit.dev', password: demoCredentials.password },
    });
    expect(managedLogin.statusCode).toBeGreaterThanOrEqual(400);

    await seedDemo(app.auth, referenceDate);

    expect(await readTotals()).toEqual(expectedTotals);
    expect(await readStableIds()).toEqual(firstIds);
  }, 30_000);

  it('reverte toda a limpeza se a reinserção falhar por email duplicado', async () => {
    await seedDemo(app.auth, referenceDate);
    await db
      .update(schema.students)
      .set({ trainerId: null })
      .where(eq(schema.students.email, 'aluno05@muvit.dev'));
    const beforeFailure = await readDatabaseSnapshot();

    let failure: unknown;
    try {
      await seedDemo(app.auth, referenceDate);
    } catch (error: unknown) {
      failure = error;
    }

    expect(failure).toMatchObject({ cause: { code: '23505' } });
    expect(await readDatabaseSnapshot()).toEqual(beforeFailure);
    const conflictingStudent = await db.query.students.findFirst({
      where: eq(schema.students.email, 'aluno05@muvit.dev'),
    });
    expect(conflictingStudent?.trainerId).toBeNull();
  }, 30_000);

  it('rejeita identidade demo existente com papel divergente', async () => {
    await seedDemo(app.auth, referenceDate);
    await db
      .update(schema.authUsers)
      .set({ role: 'student' })
      .where(eq(schema.authUsers.email, demoCredentials.trainer.email));

    await expect(seedDemo(app.auth, referenceDate)).rejects.toThrow(
      'Identidade demo com papel incompatível',
    );
  });

  it('rejeita identidade demo existente sem o perfil provisionado', async () => {
    await seedDemo(app.auth, referenceDate);
    const identity = await db.query.authUsers.findFirst({
      where: eq(schema.authUsers.email, demoCredentials.trainer.email),
    });
    if (identity === undefined) throw new Error('Identidade trainer ausente');

    await db.delete(schema.trainers).where(eq(schema.trainers.authUserId, identity.id));

    await expect(seedDemo(app.auth, referenceDate)).rejects.toThrow(
      'Identidade demo sem perfil de treinador',
    );
  });
});
