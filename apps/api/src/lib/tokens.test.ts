import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './tokens.js';

describe('tokens', () => {
  it('signs and verifies a refresh token', async () => {
    const app = await buildTestApp();
    const token = await signRefreshToken(app, { sub: 'u1', role: 'trainer' });
    const decoded = await verifyRefreshToken(app, token);
    expect(decoded.sub).toBe('u1');
    expect(decoded.role).toBe('trainer');
    await app.close();
  });
  it('access token has 15 min ttl', async () => {
    const app = await buildTestApp();
    const token = await signAccessToken(app, { sub: 'u1', role: 'trainer' });
    const decoded = app.jwt.decode<{ exp: number; iat: number }>(token);
    // biome-ignore lint/style/noNonNullAssertion: token was just signed, decode cannot return null
    expect(decoded!.exp - decoded!.iat).toBe(15 * 60);
    await app.close();
  });
});
