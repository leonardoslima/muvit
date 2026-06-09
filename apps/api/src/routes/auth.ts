import {
  authResponseSchema,
  loginSchema,
  refreshSchema,
  signupStudentSchema,
  signupTrainerSchema,
} from '@muvit/validators';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { makeAuthModule } from '../modules/auth/factory.js';
import { sendUseCaseError } from '../shared/http-error.js';

const authRateLimit = { max: 10, timeWindow: '1 minute' };

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const authModule = makeAuthModule(app);

  app.post(
    '/auth/signup/trainer',
    {
      config: { rateLimit: authRateLimit },
      schema: {
        tags: ['auth'],
        body: signupTrainerSchema,
        response: { 201: authResponseSchema, 409: z.object({ error: z.string() }) },
      },
    },
    async (req, reply) => {
      try {
        const response = await authModule.signupTrainer.execute(req.body);
        return reply.code(201).send(response);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.post(
    '/auth/signup/student',
    {
      config: { rateLimit: authRateLimit },
      schema: {
        tags: ['auth'],
        body: signupStudentSchema,
        response: { 201: authResponseSchema, 409: z.object({ error: z.string() }) },
      },
    },
    async (req, reply) => {
      try {
        const response = await authModule.signupStudent.execute(req.body);
        return reply.code(201).send(response);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.post(
    '/auth/login',
    {
      config: { rateLimit: authRateLimit },
      schema: {
        tags: ['auth'],
        body: loginSchema,
        response: { 200: authResponseSchema, 401: z.object({ error: z.string() }) },
      },
    },
    async (req, reply) => {
      try {
        return await authModule.login.execute(req.body);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.post(
    '/auth/refresh',
    {
      schema: {
        tags: ['auth'],
        body: refreshSchema,
        response: {
          200: z.object({ accessToken: z.string() }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        return await authModule.refreshToken.execute(req.body.refreshToken);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.get(
    '/auth/me',
    { preHandler: [app.requireAuth], schema: { tags: ['auth'] } },
    async (req, reply) => {
      try {
        return await authModule.getCurrentUser.execute(req.user);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.post(
    '/trainers/me/onboarding',
    {
      preHandler: [app.requireAuth, app.requireRole('trainer')],
      schema: {
        tags: ['trainers'],
        response: {
          200: z.object({
            onboardedAt: z
              .union([z.string().datetime(), z.date()])
              .transform((value) => (value instanceof Date ? value.toISOString() : value)),
          }),
        },
      },
    },
    async (req) => authModule.completeTrainerOnboarding.execute(req.user.sub),
  );
};
