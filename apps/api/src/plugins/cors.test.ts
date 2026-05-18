import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build.js';

describe('cors', () => {
  it('allows Expo web development origin', async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/auth/login',
      headers: {
        origin: 'http://localhost:8081',
        'access-control-request-method': 'POST',
      },
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8081');

    await app.close();
  });
});
