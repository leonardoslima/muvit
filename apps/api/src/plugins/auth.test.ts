import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';
import { signAccessToken } from '../lib/tokens.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
  app.get('/protected', { preHandler: [app.requireAuth] }, async () => ({ ok: true }));
  app.get('/me', { preHandler: [app.requireAuth] }, async (req) => req.user);
  app.get(
    '/trainer-only',
    { preHandler: [app.requireAuth, app.requireRole('trainer')] },
    async () => ({ ok: true }),
  );
});

afterAll(async () => {
  await app.close();
});

describe('auth plugin', () => {
  it('rejects requests without bearer token with 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/protected' });
    expect(res.statusCode).toBe(401);
  });

  it('attaches `request.user` when token is valid', async () => {
    const token = await signAccessToken(app, { sub: 'abc', role: 'trainer' });
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ sub: 'abc', role: 'trainer' });
  });

  it('requireRole rejects wrong role with 403', async () => {
    const token = await signAccessToken(app, { sub: 'a', role: 'student' });
    const res = await app.inject({
      method: 'GET',
      url: '/trainer-only',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });
});
