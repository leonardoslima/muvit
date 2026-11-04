import { db, schema } from '@muvit/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;

async function signupTrainer(email: string) {
  return signUpWithSession(app, {
    name: 'Treinador',
    email,
    password: '12345678',
    role: 'trainer',
  });
}

async function createStudent(cookie: string, name = 'Aluno do relatório') {
  const response = await app.inject({
    method: 'POST',
    url: '/students',
    headers: { cookie },
    payload: { name },
  });
  if (response.statusCode !== 201) throw new Error('student seed failed');
  return response.json().id as string;
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

describe('GET /reports/students/:studentId', () => {
  it('retorna relatório sem dados com todas as seções explícitas', async () => {
    const trainer = await signupTrainer('reports-empty@example.com');
    const studentId = await createStudent(trainer.cookie);

    const response = await app.inject({
      method: 'GET',
      url: `/reports/students/${studentId}?range=all`,
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      student: { id: studentId, name: 'Aluno do relatório', avatarUrl: null },
      period: { range: 'all', from: null, to: null },
      physicalEvolution: { hasEnoughData: false, points: [] },
      beforeAfter: { hasEnoughData: false, before: null, after: null },
      workoutAdherence: { hasEnoughData: false, completed: 0, planned: 0, percentage: null },
      summary: 'Ainda não há dados suficientes.',
    });
  });

  it('inclui as duas datas-limite e exclui dados fora do período personalizado', async () => {
    const trainer = await signupTrainer('reports-boundaries@example.com');
    const studentId = await createStudent(trainer.cookie);
    await db.insert(schema.assessments).values([
      { studentId, date: '2026-07-31', weightKg: '81' },
      { studentId, date: '2026-08-01', weightKg: '80' },
      { studentId, date: '2026-08-07', weightKg: '79' },
      { studentId, date: '2026-08-08', weightKg: '78' },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: `/reports/students/${studentId}?range=custom&from=2026-08-01&to=2026-08-07`,
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().physicalEvolution.points).toEqual([
      expect.objectContaining({ date: '2026-08-01', weightKg: 80 }),
      expect.objectContaining({ date: '2026-08-07', weightKg: 79 }),
    ]);
  });

  it('rejeita query personalizada incompleta', async () => {
    const trainer = await signupTrainer('reports-query@example.com');
    const studentId = await createStudent(trainer.cookie);

    const response = await app.inject({
      method: 'GET',
      url: `/reports/students/${studentId}?range=custom&from=2026-08-01`,
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(400);
  });

  it('exige autenticação', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/reports/students/10000000-0000-4000-8000-000000000001?range=30d',
    });

    expect(response.statusCode).toBe(401);
  });

  it('não revela aluno de outro treinador', async () => {
    const owner = await signupTrainer('reports-owner@example.com');
    const studentId = await createStudent(owner.cookie);
    const other = await signupTrainer('reports-other@example.com');

    const response = await app.inject({
      method: 'GET',
      url: `/reports/students/${studentId}?range=30d`,
      headers: { cookie: other.cookie },
    });

    expect(response.statusCode).toBe(404);
  });

  it('rejeita papel de aluno', async () => {
    const student = await signUpWithSession(app, {
      name: 'Aluno independente',
      email: 'reports-student@example.com',
      password: '12345678',
      role: 'student',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/reports/students/${student.profileId}?range=30d`,
      headers: { cookie: student.cookie },
    });

    expect(response.statusCode).toBe(403);
  });

  it('documenta todos os status públicos no OpenAPI', async () => {
    await app.ready();
    const operation = app.swagger().paths?.['/reports/students/{studentId}']?.get;

    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
  });
});
