import { describe, it, expect } from 'vitest';
import { buildTestApp } from './helpers/build.js';

describe('app', () => {
  it('responds 200 on /health', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
