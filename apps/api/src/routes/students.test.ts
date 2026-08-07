import { db, schema } from '@muvit/db';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;

async function signupTrainer(app: FastifyInstance, email: string) {
  return signUpWithSession(app, {
    name: 'Trainer',
    email,
    password: '12345678',
    role: 'trainer',
  });
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

describe('students', () => {
  it('bloqueia o quarto aluno ativo no plano free', async () => {
    const trainer = await signupTrainer(app, 'limit-free@example.com');
    await db.insert(schema.students).values(
      ['Um', 'Dois', 'Três'].map((name) => ({
        trainerId: trainer.profileId,
        isIndependent: false,
        name,
        status: 'active' as const,
      })),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie: trainer.cookie },
      payload: { name: 'Quarto aluno' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'Seu plano aceita até 3 alunos ativos.' });
  });

  it('bloqueia reativação acima do limite sem alterar o aluno', async () => {
    const trainer = await signupTrainer(app, 'limit-reactivate@example.com');
    await db.insert(schema.students).values(
      ['Um', 'Dois', 'Três'].map((name) => ({
        trainerId: trainer.profileId,
        isIndependent: false,
        name,
        status: 'active' as const,
      })),
    );
    const [pausedStudent] = await db
      .insert(schema.students)
      .values({
        trainerId: trainer.profileId,
        isIndependent: false,
        name: 'Aluno pausado',
        status: 'paused',
      })
      .returning();
    if (pausedStudent === undefined) throw new Error('fixture de aluno pausado não foi criada');

    const response = await app.inject({
      method: 'PATCH',
      url: `/students/${pausedStudent.id}`,
      headers: { cookie: trainer.cookie },
      payload: { status: 'active' },
    });

    expect(response.statusCode).toBe(409);
    const persistedStudent = await db.query.students.findFirst({
      where: eq(schema.students.id, pausedStudent.id),
    });
    expect(persistedStudent?.status).toBe('paused');
  });

  it('permite editar aluno já ativo quando o plano está no limite', async () => {
    const trainer = await signupTrainer(app, 'limit-edit@example.com');
    const createdStudents = await db
      .insert(schema.students)
      .values(
        ['Um', 'Dois', 'Três'].map((name) => ({
          trainerId: trainer.profileId,
          isIndependent: false,
          name,
          status: 'active' as const,
        })),
      )
      .returning();
    const student = createdStudents[0];
    if (student === undefined) throw new Error('fixture de aluno ativo não foi criada');

    const response = await app.inject({
      method: 'PATCH',
      url: `/students/${student.id}`,
      headers: { cookie: trainer.cookie },
      payload: { name: 'Nome atualizado' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().name).toBe('Nome atualizado');
  });

  it('mantém o plano team sem limite de alunos ativos', async () => {
    const trainer = await signupTrainer(app, 'limit-team@example.com');
    await db
      .update(schema.trainers)
      .set({ plan: 'team' })
      .where(eq(schema.trainers.id, trainer.profileId));
    await db.insert(schema.students).values(
      Array.from({ length: 51 }, (_, index) => ({
        trainerId: trainer.profileId,
        isIndependent: false,
        name: `Aluno ${index + 1}`,
        status: 'active' as const,
      })),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie: trainer.cookie },
      payload: { name: 'Aluno 52' },
    });

    expect(response.statusCode).toBe(201);
  });

  it('creates a student bound to current trainer', async () => {
    const trainer = await signupTrainer(app, 'a@a.com');

    const res = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie: trainer.cookie },
      payload: { name: 'Aluno 1', email: 'al@a.com' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ name: 'Aluno 1', isIndependent: false });
    expect(res.json().trainerId).toBe(trainer.profileId);
  });

  it('lists only my students', async () => {
    const trainer = await signupTrainer(app, 'a@a.com');
    const otherTrainer = await signupTrainer(app, 'b@b.com');

    await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie: trainer.cookie },
      payload: { name: 'Aluno Meu' },
    });
    await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie: otherTrainer.cookie },
      payload: { name: 'Aluno Outro' },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/students',
      headers: { cookie: trainer.cookie },
    });
    const body = res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe('Aluno Meu');
  });

  it('rejects students role from /students list', async () => {
    const student = await signUpWithSession(app, {
      name: 'Léo',
      email: 's@s.com',
      password: '12345678',
      role: 'student',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/students',
      headers: { cookie: student.cookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it('updates and deletes a student', async () => {
    const trainer = await signupTrainer(app, 'a@a.com');

    const c = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie: trainer.cookie },
      payload: { name: 'Aluno X' },
    });
    const id = c.json().id;
    const u = await app.inject({
      method: 'PATCH',
      url: `/students/${id}`,
      headers: { cookie: trainer.cookie },
      payload: { name: 'Aluno Y' },
    });
    expect(u.json().name).toBe('Aluno Y');
    const d = await app.inject({
      method: 'DELETE',
      url: `/students/${id}`,
      headers: { cookie: trainer.cookie },
    });
    expect(d.statusCode).toBe(204);
  });

  it('returns 404 fetching a student that belongs to another trainer', async () => {
    const trainer = await signupTrainer(app, 'a@a.com');
    const otherTrainer = await signupTrainer(app, 'b@b.com');

    const c = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie: trainer.cookie },
      payload: { name: 'Aluno X' },
    });
    const id = c.json().id;
    const r = await app.inject({
      method: 'GET',
      url: `/students/${id}`,
      headers: { cookie: otherTrainer.cookie },
    });
    expect(r.statusCode).toBe(404);
  });

  it('search filters by name (case-insensitive)', async () => {
    const trainer = await signupTrainer(app, 'a@a.com');

    await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie: trainer.cookie },
      payload: { name: 'Joao Silva' },
    });
    await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie: trainer.cookie },
      payload: { name: 'Maria' },
    });
    const r = await app.inject({
      method: 'GET',
      url: '/students?q=joao',
      headers: { cookie: trainer.cookie },
    });
    expect(r.json().items).toHaveLength(1);
  });

  it('student registers its Expo push token', async () => {
    const studentSession = await signUpWithSession(app, {
      name: 'Aluno Push',
      email: 'push@s.com',
      password: '12345678',
      role: 'student',
    });
    const studentId = studentSession.profileId;
    if (studentId === undefined) throw new Error('student profile not provisioned');

    const r = await app.inject({
      method: 'POST',
      url: '/students/me/push-token',
      headers: { cookie: studentSession.cookie },
      payload: { token: 'ExponentPushToken[abc123]' },
    });

    expect(r.statusCode).toBe(204);
    const student = await db.query.students.findFirst({
      where: eq(schema.students.id, studentId),
    });
    expect(student?.expoPushToken).toBe('ExponentPushToken[abc123]');
  });
});
