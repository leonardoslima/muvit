import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';
import { signAccessToken } from '../lib/tokens.js';

describe('auth plugin', () => {
  it('rejects requests without bearer token with 401', async () => {
    const app = await buildTestApp();
    app.get('/protected', { preHandler: [app.requireAuth] }, async () => ({ ok: true }));
    const res = await app.inject({ method: 'GET', url: '/protected' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('attaches `request.user` when token is valid', async () => {
    const app = await buildTestApp();
    app.get('/me', { preHandler: [app.requireAuth] }, async (req) => req.user);
    const token = await signAccessToken(app, { sub: 'abc', role: 'trainer' });
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ sub: 'abc', role: 'trainer' });
    await app.close();
  });

  it('requireRole rejects wrong role with 403', async () => {
    const app = await buildTestApp();
    app.get(
      '/trainer-only',
      { preHandler: [app.requireAuth, app.requireRole('trainer')] },
      async () => ({ ok: true }),
    );
    const token = await signAccessToken(app, { sub: 'a', role: 'student' });
    const res = await app.inject({
      method: 'GET',
      url: '/trainer-only',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
