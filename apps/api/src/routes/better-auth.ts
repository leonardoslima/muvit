import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../env.js';
import { forwardSetCookieHeaders } from '../shared/forward-set-cookie-headers.js';

const authRateLimit = { max: 10, timeWindow: '1 minute' };

export async function forwardBetterAuthResponse(reply: FastifyReply, response: Response) {
  reply.status(response.status);
  for (const [name, value] of response.headers.entries()) {
    if (name !== 'set-cookie') reply.header(name, value);
  }

  forwardSetCookieHeaders(reply, response.headers);

  const body = response.body === null ? null : await response.text();
  return reply.send(body);
}

export const betterAuthRoutes: FastifyPluginAsync = async (app) => {
  async function handleBetterAuth(request: FastifyRequest, reply: FastifyReply) {
    const url = new URL(request.url, env.BETTER_AUTH_URL);
    const response = await app.auth.handler(
      new Request(url, {
        method: request.method,
        headers: fromNodeHeaders(request.headers),
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      }),
    );

    return forwardBetterAuthResponse(reply, response);
  }

  app.route({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    config: { rateLimit: authRateLimit },
    handler: handleBetterAuth,
  });

  app.route({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    config: { rateLimit: authRateLimit },
    handler: handleBetterAuth,
  });

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: handleBetterAuth,
  });
};
