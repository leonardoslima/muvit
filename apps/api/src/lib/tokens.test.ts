import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './tokens.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
});

describe('tokens', () => {
  it('signs and verifies a refresh token', async () => {
    const token = await signRefreshToken(app, { sub: 'u1', role: 'trainer' });
    const decoded = await verifyRefreshToken(app, token);
    expect(decoded.sub).toBe('u1');
    expect(decoded.role).toBe('trainer');
  });
  it('access token has 15 min ttl', async () => {
    const token = await signAccessToken(app, { sub: 'u1', role: 'trainer' });
    const decoded = app.jwt.decode<{ exp: number; iat: number }>(token);
    // biome-ignore lint/style/noNonNullAssertion: token was just signed, decode cannot return null
    expect(decoded!.exp - decoded!.iat).toBe(15 * 60);
  });
});
