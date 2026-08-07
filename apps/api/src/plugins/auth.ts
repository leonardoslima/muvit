import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import type { ProfileResolver } from '../modules/auth/profile-resolver.js';
import { forwardSetCookieHeaders } from '../shared/forward-set-cookie-headers.js';

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: preHandlerHookHandler;
    requireRole: (role: 'trainer' | 'student') => preHandlerHookHandler;
  }
}

type AuthPluginOptions = {
  profileResolver: ProfileResolver;
};

function isRole(value: unknown): value is 'trainer' | 'student' {
  return value === 'trainer' || value === 'student';
}

export default fp<AuthPluginOptions>(async (app, options) => {
  app.decorateRequest('identity');

  app.decorate('requireAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    let sessionResult: Awaited<ReturnType<typeof app.auth.api.getSessionWithHeaders>>;

    try {
      sessionResult = await app.auth.api.getSessionWithHeaders({
        headers: fromNodeHeaders(request.headers),
      });
    } catch {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    forwardSetCookieHeaders(reply, sessionResult.headers);
    const session = sessionResult.session;
    if (!session || !isRole(session.user.role)) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const profileId = await options.profileResolver.resolveProfile({
      authUserId: session.user.id,
      role: session.user.role,
    });

    if (profileId === null) {
      request.log.warn({ category: 'auth_profile_missing' });
      return reply.code(401).send({ error: 'unauthorized' });
    }

    request.identity = {
      authUserId: session.user.id,
      profileId,
      role: session.user.role,
    };
  });

  app.decorate(
    'requireRole',
    (role: 'trainer' | 'student') => async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.identity.role !== role) {
        return reply.code(403).send({ error: 'forbidden' });
      }
    },
  );
});
