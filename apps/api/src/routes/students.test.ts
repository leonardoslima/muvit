import { db, schema } from '@muvit/db';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;
let trainerToken: string;
let otherTrainerToken: string;

async function signupTrainer(app: FastifyInstance, email: string) {
  const r = await app.inject({
    method: 'POST',
    url: '/auth/signup/trainer',
    payload: { name: 'Trainer', email, password: '12345678' },
  });
  return r.json().accessToken as string;
}

beforeAll(async () => {
  app = await buildTestApp();
});

beforeEach(async () => {
  await truncateAll();
  trainerToken = await signupTrainer(app, 'a@a.com');
  otherTrainerToken = await signupTrainer(app, 'b@b.com');
});
afterAll(async () => {
  await app.close();
  await closeDb();
});

describe('students', () => {
  it('creates a student bound to current trainer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { name: 'Aluno 1', email: 'al@a.com' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ name: 'Aluno 1', isIndependent: false });
    expect(res.json().trainerId).toBeDefined();
  });

  it('lists only my students', async () => {
    await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { name: 'Aluno Meu' },
    });
    await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${otherTrainerToken}` },
      payload: { name: 'Aluno Outro' },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/students',
      headers: { authorization: `Bearer ${trainerToken}` },
    });
    const body = res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe('Aluno Meu');
  });

  it('rejects students role from /students list', async () => {
    const studentSign = await app.inject({
      method: 'POST',
      url: '/auth/signup/student',
      payload: { name: 'Léo', email: 's@s.com', password: '12345678' },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/students',
      headers: { authorization: `Bearer ${studentSign.json().accessToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('updates and deletes a student', async () => {
    const c = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { name: 'Aluno X' },
    });
    const id = c.json().id;
    const u = await app.inject({
      method: 'PATCH',
      url: `/students/${id}`,
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { name: 'Aluno Y' },
    });
    expect(u.json().name).toBe('Aluno Y');
    const d = await app.inject({
      method: 'DELETE',
      url: `/students/${id}`,
      headers: { authorization: `Bearer ${trainerToken}` },
    });
    expect(d.statusCode).toBe(204);
  });

  it('returns 404 fetching a student that belongs to another trainer', async () => {
    const c = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { name: 'Aluno X' },
    });
    const id = c.json().id;
    const r = await app.inject({
      method: 'GET',
      url: `/students/${id}`,
      headers: { authorization: `Bearer ${otherTrainerToken}` },
    });
    expect(r.statusCode).toBe(404);
  });

  it('search filters by name (case-insensitive)', async () => {
    await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { name: 'Joao Silva' },
    });
    await app.inject({
      method: 'POST',
      url: '/students',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { name: 'Maria' },
    });
    const r = await app.inject({
      method: 'GET',
      url: '/students?q=joao',
      headers: { authorization: `Bearer ${trainerToken}` },
    });
    expect(r.json().items).toHaveLength(1);
  });

  it('student registers its Expo push token', async () => {
    const s = await app.inject({
      method: 'POST',
      url: '/auth/signup/student',
      payload: { name: 'Aluno Push', email: 'push@s.com', password: '12345678' },
    });
    const token = s.json().accessToken;
    const studentId = s.json().user.id;

    const r = await app.inject({
      method: 'POST',
      url: '/students/me/push-token',
      headers: { authorization: `Bearer ${token}` },
      payload: { token: 'ExponentPushToken[abc123]' },
    });

    expect(r.statusCode).toBe(204);
    const student = await db.query.students.findFirst({
      where: eq(schema.students.id, studentId),
    });
    expect(student?.expoPushToken).toBe('ExponentPushToken[abc123]');
  });
});
