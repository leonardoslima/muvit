import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { forwardBetterAuthResponse } from './better-auth.js';

const app = Fastify();

afterEach(async () => {
  await app.close();
});

describe('resposta HTTP do Better Auth', () => {
  it('preserva dois headers Set-Cookie separados', async () => {
    app.get('/cookies', async (_request, reply) => {
      const headers = new Headers({ 'content-type': 'application/json' });
      headers.append('set-cookie', 'muvit.session=abc; Path=/; HttpOnly');
      headers.append('set-cookie', 'muvit.state=xyz; Path=/; HttpOnly');

      return forwardBetterAuthResponse(
        reply,
        new Response(JSON.stringify({ ok: true }), { status: 201, headers }),
      );
    });

    const response = await app.inject({ method: 'GET', url: '/cookies' });

    expect(response.statusCode).toBe(201);
    expect(response.headers['set-cookie']).toEqual([
      'muvit.session=abc; Path=/; HttpOnly',
      'muvit.state=xyz; Path=/; HttpOnly',
    ]);
    expect(response.json()).toEqual({ ok: true });
  });
});
