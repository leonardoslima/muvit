import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;

async function signupTrainer(): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/signup/trainer',
    payload: { name: 'Trainer', email: 'trainer@example.com', password: '12345678' },
  });

  return response.json().accessToken as string;
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

describe('uploads', () => {
  it('creates a presigned upload URL for assessment photos', async () => {
    const trainerToken = await signupTrainer();

    const response = await app.inject({
      method: 'POST',
      url: '/uploads/presign',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { kind: 'assessment-photo', contentType: 'image/jpeg' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      publicUrl: expect.stringContaining('/assessment-photo/'),
      fields: {},
    });
    expect(response.json().uploadUrl).toContain('X-Amz-Signature=');
  });

  it('rejects unsupported content types', async () => {
    const trainerToken = await signupTrainer();

    const response = await app.inject({
      method: 'POST',
      url: '/uploads/presign',
      headers: { authorization: `Bearer ${trainerToken}` },
      payload: { kind: 'avatar', contentType: 'image/gif' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('requires authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/uploads/presign',
      payload: { kind: 'avatar', contentType: 'image/png' },
    });

    expect(response.statusCode).toBe(401);
  });
});
