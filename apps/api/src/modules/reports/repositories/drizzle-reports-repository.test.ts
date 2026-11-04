import { db, schema } from '@muvit/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../../../test/helpers/auth.js';
import { buildTestApp } from '../../../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../../../test/helpers/db.js';
import { DrizzleReportsRepository } from './drizzle-reports-repository.js';

let app: FastifyInstance;

async function createTrainerAndStudents() {
  const trainer = await signUpWithSession(app, {
    name: 'Treinador',
    email: 'reports-repository@example.com',
    password: '12345678',
    role: 'trainer',
  });
  const createStudent = async (name: string) => {
    const response = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie: trainer.cookie },
      payload: { name },
    });
    if (response.statusCode !== 201) throw new Error('student seed failed');
    return response.json().id as string;
  };
  return {
    trainerId: trainer.profileId,
    studentA: await createStudent('Aluno A'),
    studentB: await createStudent('Aluno B'),
  };
}

async function createPlan(studentId: string, trainerId: string, name: string) {
  const [plan] = await db
    .insert(schema.workoutPlans)
    .values({
      studentId,
      trainerId,
      name,
      status: 'active',
      startDate: '2026-07-01',
    })
    .returning();
  if (!plan) throw new Error('plan seed failed');
  const [day] = await db
    .insert(schema.workoutDays)
    .values({ planId: plan.id, label: 'A', dayOrder: 0 })
    .returning();
  if (!day) throw new Error('day seed failed');
  return { plan, day };
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

describe('DrizzleReportsRepository', () => {
  it('não expõe exercício de outro aluno por uma referência cruzada de série', async () => {
    const { trainerId, studentA, studentB } = await createTrainerAndStudents();
    const planA = await createPlan(studentA, trainerId, 'Plano A');
    const planB = await createPlan(studentB, trainerId, 'Plano B');
    const [exercise] = await db
      .insert(schema.exercises)
      .values({ trainerId, name: 'Exercício privado B', muscleGroup: 'chest' })
      .returning();
    if (!exercise) throw new Error('exercise seed failed');
    const [workoutExerciseB] = await db
      .insert(schema.workoutExercises)
      .values({
        workoutDayId: planB.day.id,
        exerciseId: exercise.id,
        exerciseOrder: 0,
        sets: 1,
        reps: '10',
      })
      .returning();
    if (!workoutExerciseB) throw new Error('workout exercise seed failed');
    const [logA] = await db
      .insert(schema.workoutLogs)
      .values({
        studentId: studentA,
        workoutDayId: planA.day.id,
        date: '2026-08-01',
        completed: true,
      })
      .returning();
    if (!logA) throw new Error('log seed failed');
    await db.insert(schema.logSets).values({
      workoutLogId: logA.id,
      workoutExerciseId: workoutExerciseB.id,
      setNumber: 1,
      repsDone: 10,
      loadKg: '60',
      completed: true,
    });

    const rows = await new DrizzleReportsRepository().listExerciseSets(studentA, {
      from: '2026-08-01',
      to: '2026-08-01',
    });

    expect(rows).toEqual([]);
  });

  it('lê planos, logs e séries legítimos com os campos necessários ao relatório', async () => {
    const { trainerId, studentA } = await createTrainerAndStudents();
    const { day } = await createPlan(studentA, trainerId, 'Plano válido');
    const [exercise] = await db
      .insert(schema.exercises)
      .values({ trainerId, name: 'Supino', muscleGroup: 'chest' })
      .returning();
    if (!exercise) throw new Error('exercise seed failed');
    const [workoutExercise] = await db
      .insert(schema.workoutExercises)
      .values({
        workoutDayId: day.id,
        exerciseId: exercise.id,
        exerciseOrder: 0,
        sets: 1,
        reps: '10',
      })
      .returning();
    if (!workoutExercise) throw new Error('workout exercise seed failed');
    const [log] = await db
      .insert(schema.workoutLogs)
      .values({
        studentId: studentA,
        workoutDayId: day.id,
        date: '2026-08-01',
        rpe: 8,
        completed: true,
      })
      .returning();
    if (!log) throw new Error('log seed failed');
    await db.insert(schema.logSets).values({
      workoutLogId: log.id,
      workoutExerciseId: workoutExercise.id,
      setNumber: 1,
      repsDone: 10,
      loadKg: '60',
      completed: true,
    });
    const repository = new DrizzleReportsRepository();
    const period = { from: '2026-07-01', to: '2026-08-07' };

    const [plans, logs, sets] = await Promise.all([
      repository.listPlans(studentA, period),
      repository.listWorkoutLogs(studentA, period),
      repository.listExerciseSets(studentA, period),
    ]);

    expect(plans).toEqual([
      expect.objectContaining({ startDate: '2026-07-01', endDate: null, workoutDays: 1 }),
    ]);
    expect(logs).toEqual([{ date: '2026-08-01', completed: true, rpe: 8 }]);
    expect(sets).toEqual([
      {
        date: '2026-08-01',
        exerciseId: exercise.id,
        name: 'Supino',
        loadKg: 60,
        repsDone: 10,
        completed: true,
      },
    ]);
  });
});
