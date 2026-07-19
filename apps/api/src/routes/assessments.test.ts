import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;

async function signupTrainer(email: string) {
  return signUpWithSession(app, {
    name: 'Trainer',
    email,
    password: '12345678',
    role: 'trainer',
  });
}

async function createStudent(cookie: string, name: string): Promise<string> {
  const r = await app.inject({
    method: 'POST',
    url: '/students',
    headers: { cookie },
    payload: { name },
  });
  return r.json().id as string;
}

async function signupStudent(email: string) {
  const session = await signUpWithSession(app, {
    name: 'Independente',
    email,
    password: '12345678',
    role: 'student',
  });
  const id = session.profileId;
  if (id === undefined) throw new Error('student profile not provisioned');
  return { id, cookie: session.cookie };
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
    const trainer = await signupTrainer('a@a.com');
    const studentId = await createStudent(trainer.cookie, 'Aluno Teste');

    const r = await app.inject({
      method: 'POST',
      url: `/students/${studentId}/assessments`,
      headers: { cookie: trainer.cookie },
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
    const trainer = await signupTrainer('a@a.com');
    const otherTrainer = await signupTrainer('b@b.com');
    const studentId = await createStudent(trainer.cookie, 'Aluno Teste');

    const r = await app.inject({
      method: 'POST',
      url: `/students/${studentId}/assessments`,
      headers: { cookie: otherTrainer.cookie },
      payload: { date: '2026-04-01', weightKg: 80 },
    });
    expect(r.statusCode).toBe(404);
  });

  it('returns 404 when another student lists assessments', async () => {
    const owner = await signupStudent('owner@i.com');
    const other = await signupStudent('other@i.com');

    const r = await app.inject({
      method: 'GET',
      url: `/students/${owner.id}/assessments`,
      headers: { cookie: other.cookie },
    });
    expect(r.statusCode).toBe(404);
  });

  it('lists assessments ordered by date desc', async () => {
    const trainer = await signupTrainer('a@a.com');
    const studentId = await createStudent(trainer.cookie, 'Aluno Teste');
    const dates = ['2026-01-15', '2026-03-10', '2026-02-20'];

    for (const date of dates) {
      await app.inject({
        method: 'POST',
        url: `/students/${studentId}/assessments`,
        headers: { cookie: trainer.cookie },
        payload: { date },
      });
    }
    const r = await app.inject({
      method: 'GET',
      url: `/students/${studentId}/assessments`,
      headers: { cookie: trainer.cookie },
    });
    const items = r.json().items as Array<{ date: string }>;
    expect(items.map((i) => i.date)).toEqual(['2026-03-10', '2026-02-20', '2026-01-15']);
  });

  it('updates an assessment owned by the trainer', async () => {
    const trainer = await signupTrainer('a@a.com');
    const studentId = await createStudent(trainer.cookie, 'Aluno Teste');

    const c = await app.inject({
      method: 'POST',
      url: `/students/${studentId}/assessments`,
      headers: { cookie: trainer.cookie },
      payload: { date: '2026-04-01', weightKg: 80 },
    });
    const id = c.json().id;
    const u = await app.inject({
      method: 'PATCH',
      url: `/assessments/${id}`,
      headers: { cookie: trainer.cookie },
      payload: { weightKg: 79.5, notes: 'check' },
    });
    expect(u.statusCode).toBe(200);
    expect(u.json().notes).toBe('check');
  });

  it('deletes an assessment', async () => {
    const trainer = await signupTrainer('a@a.com');
    const studentId = await createStudent(trainer.cookie, 'Aluno Teste');

    const c = await app.inject({
      method: 'POST',
      url: `/students/${studentId}/assessments`,
      headers: { cookie: trainer.cookie },
      payload: { date: '2026-04-01' },
    });
    const id = c.json().id;
    const d = await app.inject({
      method: 'DELETE',
      url: `/assessments/${id}`,
      headers: { cookie: trainer.cookie },
    });
    expect(d.statusCode).toBe(204);
  });

  it('independent student creates and lists own assessments', async () => {
    const { id: myId, cookie } = await signupStudent('i@i.com');

    const c = await app.inject({
      method: 'POST',
      url: `/students/${myId}/assessments`,
      headers: { cookie },
      payload: { date: '2026-04-01', weightKg: 70 },
    });
    expect(c.statusCode).toBe(201);

    const l = await app.inject({
      method: 'GET',
      url: `/students/${myId}/assessments`,
      headers: { cookie },
    });
    expect(l.json().items).toHaveLength(1);
  });
});
