import { db, schema } from '@muvit/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

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

describe('trainer summary', () => {
  it('uses the trainer profileId to aggregate domain records', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Trainer',
      email: 'trainer-summary@example.com',
      password: '12345678',
      role: 'trainer',
    });

    expect(trainer.authUserId).not.toBe(trainer.profileId);
    expect(trainer.profileId).toBeDefined();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie: trainer.cookie },
      payload: { name: 'Aluno do resumo' },
    });

    expect(createResponse.statusCode).toBe(201);

    const response = await app.inject({
      method: 'GET',
      url: '/trainer/summary',
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().students.total).toBe(1);
  });

  it('agrega vencimentos, avaliações pendentes e inatividade real dos alunos', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Trainer',
      email: 'trainer-dashboard@example.com',
      password: '12345678',
      role: 'trainer',
    });
    const now = new Date();
    const dateDaysFromNow = (days: number) => {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    };
    const createdAt = new Date(now);
    createdAt.setUTCDate(createdAt.getUTCDate() - 20);
    const [inactiveStudent, currentStudent] = await db
      .insert(schema.students)
      .values([
        { name: 'Sem treino', trainerId: trainer.profileId, status: 'active', createdAt },
        { name: 'Em dia', trainerId: trainer.profileId, status: 'active', createdAt },
      ])
      .returning();
    if (!inactiveStudent || !currentStudent) throw new Error('Alunos não criados.');
    const [plan] = await db
      .insert(schema.workoutPlans)
      .values({
        name: 'Plano vigente',
        studentId: currentStudent.id,
        trainerId: trainer.profileId,
        status: 'active',
        endDate: dateDaysFromNow(3),
      })
      .returning();
    if (!plan) throw new Error('Plano não criado.');
    const [day] = await db
      .insert(schema.workoutDays)
      .values({ planId: plan.id, label: 'Treino real', dayOrder: 0 })
      .returning();
    if (!day) throw new Error('Dia não criado.');
    await db.insert(schema.workoutLogs).values({
      studentId: currentStudent.id,
      workoutDayId: day.id,
      date: dateDaysFromNow(-3),
      completed: true,
    });
    await db.insert(schema.assessments).values({
      studentId: currentStudent.id,
      date: dateDaysFromNow(-10),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/trainer/summary',
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      students: { active: 2, inactive7d: 1 },
      workouts: { expiringThisWeek: 1 },
      assessments: { pending: 1 },
    });
  });
});
