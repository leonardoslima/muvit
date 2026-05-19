import type { FastifyInstance } from 'fastify';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;
beforeEach(async () => {
  await truncateAll();
  app = await buildTestApp();
});
afterAll(async () => {
  await closeDb();
});

describe('auth', () => {
  it('signs up a trainer and returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup/trainer',
      payload: { name: 'Ana', email: 'ana@ex.com', password: '12345678' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user).toMatchObject({ email: 'ana@ex.com', role: 'trainer' });
  });

  it('rejects duplicate trainer email with 409', async () => {
    await app.inject({
      method: 'POST',
      url: '/auth/signup/trainer',
      payload: { name: 'Ana', email: 'a@a.com', password: '12345678' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup/trainer',
      payload: { name: 'Bia', email: 'a@a.com', password: '12345678' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('logs in with valid credentials', async () => {
    await app.inject({
      method: 'POST',
      url: '/auth/signup/trainer',
      payload: { name: 'Ana', email: 'a@a.com', password: '12345678' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'a@a.com', password: '12345678', role: 'trainer' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeDefined();
  });

  it('rejects wrong password with 401', async () => {
    await app.inject({
      method: 'POST',
      url: '/auth/signup/trainer',
      payload: { name: 'Ana', email: 'a@a.com', password: '12345678' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'a@a.com', password: 'wrong-pw', role: 'trainer' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('refresh returns a fresh access token', async () => {
    const sign = await app.inject({
      method: 'POST',
      url: '/auth/signup/trainer',
      payload: { name: 'Ana', email: 'a@a.com', password: '12345678' },
    });
    const { refreshToken } = sign.json();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeDefined();
  });

  it('GET /auth/me returns current user', async () => {
    const sign = await app.inject({
      method: 'POST',
      url: '/auth/signup/trainer',
      payload: { name: 'Ana', email: 'a@a.com', password: '12345678' },
    });
    const { accessToken } = sign.json();
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ email: 'a@a.com', role: 'trainer' });
  });

  it('trainer completes onboarding', async () => {
    const sign = await app.inject({
      method: 'POST',
      url: '/auth/signup/trainer',
      payload: { name: 'Ana', email: 'a@a.com', password: '12345678' },
    });
    const { accessToken } = sign.json();

    const res = await app.inject({
      method: 'POST',
      url: '/trainers/me/onboarding',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().onboardedAt).toEqual(expect.any(String));
  });

  it('signs up an independent student', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup/student',
      payload: { name: 'Léo', email: 'leo@ex.com', password: '12345678' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().user.role).toBe('student');
  });
});
