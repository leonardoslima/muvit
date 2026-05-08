import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: preHandlerHookHandler;
    requireRole: (role: 'trainer' | 'student') => preHandlerHookHandler;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: 'trainer' | 'student' };
    user: { sub: string; role: 'trainer' | 'student' };
  }
}

export default fp(async (app) => {
  app.decorate('requireAuth', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });

  app.decorate(
    'requireRole',
    (role: 'trainer' | 'student') => async (req: FastifyRequest, reply: FastifyReply) => {
      if (req.user.role !== role) return reply.code(403).send({ error: 'forbidden' });
    },
  );
});
