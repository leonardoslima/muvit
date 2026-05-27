import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;

async function signupTrainer(email: string) {
  const r = await app.inject({
    method: 'POST',
    url: '/auth/signup/trainer',
    payload: { name: 'Trainer', email, password: '12345678' },
  });
  return r.json().accessToken as string;
}

async function createStudent(token: string, name: string): Promise<string> {
  const r = await app.inject({
    method: 'POST',
    url: '/students',
    headers: { authorization: `Bearer ${token}` },
    payload: { name },
  });
  return r.json().id as string;
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

describe('assessments', () => {
  it('trainer creates an assessment for own student', async () => {
    const trainerToken = await signupTrainer('a@a.com');
    const studentId = await createStudent(trainerToken, 'Aluno Teste');

    const r = await app.inject({
      method: 'POST',
      url: `/students/${studentId}/assessments`,
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: {
        date: '2026-04-01',
        weightKg: 78.5,
        bodyFatPct: 18.2,
        measurements: { chest: 102 },
      },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ studentId, date: '2026-04-01' });
  });

  it('returns 404 when other trainer tries to create assessment for the student', async () => {
    const trainerToken = await signupTrainer('a@a.com');
    const otherTrainerToken = await signupTrainer('b@b.com');
    const studentId = await createStudent(trainerToken, 'Aluno Teste');

    const r = await app.inject({
      method: 'POST',
      url: `/students/${studentId}/assessments`,
      headers: { authorization: `Bearer ${otherTrainerToken}` },
      payload: { date: '2026-04-01', weightKg: 80 },
    });
    expect(r.statusCode).toBe(404);
  });

  it('lists assessments ordered by date desc', async () => {
    const trainerToken = await signupTrainer('a@a.com');
    const studentId = await createStudent(trainerToken, 'Aluno Teste');
    const dates = ['2026-01-15', '2026-03-10', '2026-02-20'];

    for (const date of dates) {
      await app.inject({
        method: 'POST',
        url: `/students/${studentId}/assessments`,
        headers: { authorization: `Bearer ${trainerToken}` },
        payload: { date },
      });
    }
    const r = await app.inject({
      method: 'GET',
      url: `/students/${studentId}/assessments`,
      headers: { authorization: `Bearer ${trainerToken}` },
    });
    const items = r.json().items as Array<{ date: string }>;
    expect(items.map((i) => i.date)).toEqual(['2026-03-10', '2026-02-20', '2026-01-15']);
  });

  it('updates an assessment owned by the trainer', async () => {
    const trainerToken = await signupTrainer('a@a.com');
    const studentId = await createStudent(trainerToken, 'Aluno Teste');

    const c = await app.inject({
      method: 'POST',
      url: `/students/${studentId}/assessments`,
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { date: '2026-04-01', weightKg: 80 },
    });
    const id = c.json().id;
    const u = await app.inject({
      method: 'PATCH',
      url: `/assessments/${id}`,
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { weightKg: 79.5, notes: 'check' },
    });
    expect(u.statusCode).toBe(200);
    expect(u.json().notes).toBe('check');
  });

  it('deletes an assessment', async () => {
    const trainerToken = await signupTrainer('a@a.com');
    const studentId = await createStudent(trainerToken, 'Aluno Teste');

    const c = await app.inject({
      method: 'POST',
      url: `/students/${studentId}/assessments`,
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { date: '2026-04-01' },
    });
    const id = c.json().id;
    const d = await app.inject({
      method: 'DELETE',
      url: `/assessments/${id}`,
      headers: { authorization: `Bearer ${trainerToken}` },
    });
    expect(d.statusCode).toBe(204);
  });

  it('independent student creates and lists own assessments', async () => {
    const sign = await app.inject({
      method: 'POST',
      url: '/auth/signup/student',
      payload: { name: 'Independente', email: 'i@i.com', password: '12345678' },
    });
    const token = sign.json().accessToken;
    const myId = sign.json().user.id;

    const c = await app.inject({
      method: 'POST',
      url: `/students/${myId}/assessments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { date: '2026-04-01', weightKg: 70 },
    });
    expect(c.statusCode).toBe(201);

    const l = await app.inject({
      method: 'GET',
      url: `/students/${myId}/assessments`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(l.json().items).toHaveLength(1);
  });
});
