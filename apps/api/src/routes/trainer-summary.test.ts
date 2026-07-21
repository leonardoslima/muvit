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
});
