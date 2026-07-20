import { db, schema } from '@muvit/db';
import { eq } from 'drizzle-orm';
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

describe('trainers', () => {
  it('completa o onboarding do perfil do treinador autenticado', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Treinadora',
      email: 'trainer-onboarding@example.com',
      password: '12345678',
      role: 'trainer',
    });
    expect(trainer.profileId).not.toBe(trainer.authUserId);

    const response = await app.inject({
      method: 'POST',
      url: '/trainers/onboarding',
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ onboardedAt: expect.any(String) });

    const persistedTrainer = await db.query.trainers.findFirst({
      where: eq(schema.trainers.id, trainer.profileId),
    });
    expect(persistedTrainer?.onboardedAt?.toISOString()).toBe(response.json().onboardedAt);
  });

  it('rejeita aluno autenticado', async () => {
    const student = await signUpWithSession(app, {
      name: 'Aluno',
      email: 'student-onboarding@example.com',
      password: '12345678',
      role: 'student',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/trainers/onboarding',
      headers: { cookie: student.cookie },
    });

    expect(response.statusCode).toBe(403);
  });

  it('rejeita requisição sem sessão', async () => {
    const response = await app.inject({ method: 'POST', url: '/trainers/onboarding' });

    expect(response.statusCode).toBe(401);
  });
});
