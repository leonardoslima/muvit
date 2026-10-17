import { randomUUID } from 'node:crypto';
import { db, schema } from '@muvit/db';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb } from '../../test/helpers/db.js';

let app: FastifyInstance;
const authUserIds: string[] = [];
const exerciseIds: string[] = [];

async function signup(role: 'student' | 'trainer' = 'student') {
  const session = await signUpWithSession(app, {
    name: 'Evolução',
    email: `evolution-${randomUUID()}@example.com`,
    password: '12345678',
    role,
  });
  authUserIds.push(session.authUserId);
  return session;
}

async function createDay(studentId: string) {
  const [plan] = await db
    .insert(schema.workoutPlans)
    .values({ studentId, name: 'Plano evolução' })
    .returning();
  if (!plan) throw new Error('Plano de teste ausente');
  const [day] = await db
    .insert(schema.workoutDays)
    .values({ planId: plan.id, label: 'A', dayOrder: 0 })
    .returning();
  if (!day) throw new Error('Dia de teste ausente');
  return day.id;
}

function evolution(cookie: string, date = '2026-10-17') {
  return app.inject({
    method: 'GET',
    url: `/students/me/workout-evolution?date=${date}`,
    headers: { cookie },
  });
}

function readGoal(cookie: string) {
  return app.inject({ method: 'GET', url: '/students/me/workout-goal', headers: { cookie } });
}

function saveGoal(cookie: string, weeklyGoal: unknown) {
  return app.inject({
    method: 'PATCH',
    url: '/students/me/workout-goal',
    headers: { cookie },
    payload: { weeklyGoal },
  });
}

beforeAll(async () => {
  app = await buildTestApp();
});

afterEach(async () => {
  if (authUserIds.length === 0) return;
  await db.delete(schema.authUsers).where(inArray(schema.authUsers.id, authUserIds));
  authUserIds.length = 0;
  if (exerciseIds.length > 0) {
    await db.delete(schema.exercises).where(inArray(schema.exercises.id, exerciseIds));
    exerciseIds.length = 0;
  }
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

describe('evolução e meta semanal do aluno', () => {
  it('inicia sem histórico ou meta inventada', async () => {
    const student = await signup();
    expect(student.profileId).not.toBe(student.authUserId);
    const summary = await evolution(student.cookie);
    expect(summary.statusCode).toBe(200);
    expect(summary.json()).toEqual({ streakWeeks: 0, completedThisWeek: 0, weeklyGoal: null });
    expect((await readGoal(student.cookie)).json()).toEqual({ weeklyGoal: null });
  });

  it('persiste, atualiza e remove apenas a meta do perfil autenticado', async () => {
    const student = await signup();
    const other = await signup();
    for (const goal of [1, 7, 4]) {
      const response = await saveGoal(student.cookie, goal);
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ weeklyGoal: goal });
      expect((await readGoal(student.cookie)).json()).toEqual({ weeklyGoal: goal });
    }
    expect((await evolution(student.cookie)).json().weeklyGoal).toBe(4);
    expect((await readGoal(other.cookie)).json()).toEqual({ weeklyGoal: null });
    expect(
      await db
        .select()
        .from(schema.studentWorkoutGoals)
        .where(eq(schema.studentWorkoutGoals.studentId, student.profileId)),
    ).toEqual([{ studentId: student.profileId, weeklyGoal: 4 }]);

    const removed = await saveGoal(student.cookie, null);
    expect(removed.statusCode).toBe(200);
    expect(removed.json()).toEqual({ weeklyGoal: null });
    expect((await readGoal(student.cookie)).json()).toEqual({ weeklyGoal: null });
    expect((await evolution(student.cookie)).json().weeklyGoal).toBeNull();
    expect(
      await db
        .select()
        .from(schema.studentWorkoutGoals)
        .where(eq(schema.studentWorkoutGoals.studentId, student.profileId)),
    ).toEqual([]);
    expect((await saveGoal(student.cookie, null)).statusCode).toBe(200);
  });

  it('agrega mais de 30 registros, ignorando rascunhos, futuro e outro aluno', async () => {
    const student = await signup();
    const other = await signup();
    const dayId = await createDay(student.profileId);
    const otherDayId = await createDay(other.profileId);
    await db.insert(schema.workoutLogs).values([
      ...Array.from({ length: 35 }, () => ({
        studentId: student.profileId,
        workoutDayId: dayId,
        date: '2026-10-12',
        completed: true,
      })),
      { studentId: student.profileId, workoutDayId: dayId, date: '2026-10-11', completed: true },
      { studentId: student.profileId, workoutDayId: dayId, date: '2026-10-04', completed: true },
      { studentId: student.profileId, workoutDayId: dayId, date: '2026-10-15', completed: false },
      { studentId: student.profileId, workoutDayId: dayId, date: '2026-10-18', completed: true },
      { studentId: other.profileId, workoutDayId: otherDayId, date: '2026-10-12', completed: true },
    ]);
    const summary = await evolution(student.cookie);
    expect(summary.statusCode).toBe(200);
    expect(summary.json()).toEqual({ streakWeeks: 3, completedThisWeek: 35, weeklyGoal: null });
    expect((await evolution(other.cookie)).json()).toEqual({
      streakWeeks: 1,
      completedThisWeek: 1,
      weeklyGoal: null,
    });
  });

  it('preserva a semana anterior na segunda-feira e respeita a virada do ano', async () => {
    const student = await signup();
    const workoutDayId = await createDay(student.profileId);
    await db.insert(schema.workoutLogs).values([
      { studentId: student.profileId, workoutDayId, date: '2026-12-27', completed: true },
      { studentId: student.profileId, workoutDayId, date: '2027-01-03', completed: true },
      { studentId: student.profileId, workoutDayId, date: '2027-01-04', completed: true },
    ]);
    expect((await evolution(student.cookie, '2027-01-03')).json()).toEqual({
      streakWeeks: 2,
      completedThisWeek: 1,
      weeklyGoal: null,
    });
    expect((await evolution(student.cookie, '2027-01-04')).json()).toEqual({
      streakWeeks: 3,
      completedThisWeek: 1,
      weeklyGoal: null,
    });
    expect((await evolution(student.cookie, '2027-01-11')).json()).toEqual({
      streakWeeks: 3,
      completedThisWeek: 0,
      weeklyGoal: null,
    });
    expect((await evolution(student.cookie, '2027-01-18')).json()).toEqual({
      streakWeeks: 0,
      completedThisWeek: 0,
      weeklyGoal: null,
    });
  });

  it('reflete uma conclusão sincronizada sem reaproveitar resumo antigo', async () => {
    const student = await signup();
    const workoutDayId = await createDay(student.profileId);
    const [exercise] = await db
      .insert(schema.exercises)
      .values({ name: 'Exercício evolução', muscleGroup: 'chest' })
      .returning();
    if (!exercise) throw new Error('Exercício de teste ausente');
    exerciseIds.push(exercise.id);
    const [workoutExercise] = await db
      .insert(schema.workoutExercises)
      .values({
        workoutDayId,
        exerciseId: exercise.id,
        exerciseOrder: 0,
        sets: 1,
        reps: '10',
      })
      .returning();
    if (!workoutExercise) throw new Error('Exercício do treino de teste ausente');
    const started = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { cookie: student.cookie },
      payload: { workoutDayId, date: '2026-10-17' },
    });
    expect(started.statusCode).toBe(201);
    expect((await evolution(student.cookie)).json().completedThisWeek).toBe(0);
    const finished = await app.inject({
      method: 'PATCH',
      url: `/workout-logs/${started.json().id}/finish`,
      headers: { cookie: student.cookie },
      payload: {
        durationMin: 30,
        sets: [{ workoutExerciseId: workoutExercise.id, setNumber: 1, completed: true }],
      },
    });
    expect(finished.statusCode).toBe(200);
    expect((await evolution(student.cookie)).json()).toEqual({
      streakWeeks: 1,
      completedThisWeek: 1,
      weeklyGoal: null,
    });
  });

  it.each([0, 8, 1.5, '3', false])('rejeita meta inválida %s', async (goal: unknown) => {
    const student = await signup();
    expect((await saveGoal(student.cookie, goal)).statusCode).toBe(400);
    expect((await readGoal(student.cookie)).json()).toEqual({ weeklyGoal: null });
  });

  it('exige weeklyGoal no PATCH e data de calendário válida na consulta', async () => {
    const student = await signup();
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/students/me/workout-goal',
          headers: { cookie: student.cookie },
          payload: {},
        })
      ).statusCode,
    ).toBe(400);
    for (const query of ['', '?date=2026-02-30', '?date=2026-10-17T00:00:00Z']) {
      expect(
        (
          await app.inject({
            method: 'GET',
            url: `/students/me/workout-evolution${query}`,
            headers: { cookie: student.cookie },
          })
        ).statusCode,
      ).toBe(400);
    }
  });

  it.each(['GET', 'PATCH'] as const)(
    'impede professor e visitante de usar meta via %s',
    async (method) => {
      const trainer = await signup('trainer');
      const payload = method === 'PATCH' ? { weeklyGoal: 3 } : undefined;
      const denied = await app.inject({
        method,
        url: '/students/me/workout-goal',
        headers: { cookie: trainer.cookie },
        payload,
      });
      expect(denied.statusCode).toBe(403);
      expect(
        (await app.inject({ method, url: '/students/me/workout-goal', payload })).statusCode,
      ).toBe(401);
    },
  );

  it('impede professor e visitante de consultar evolução', async () => {
    const trainer = await signup('trainer');
    expect((await evolution(trainer.cookie)).statusCode).toBe(403);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/students/me/workout-evolution?date=2026-10-17',
        })
      ).statusCode,
    ).toBe(401);
  });
});
