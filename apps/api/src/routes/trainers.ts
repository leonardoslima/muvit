import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { makeTrainersModule } from '../modules/trainers/factory.js';

export const trainersRoutes: FastifyPluginAsyncZod = async (app) => {
  const trainersModule = makeTrainersModule();

  app.post(
    '/trainers/onboarding',
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
    async (request) => trainersModule.completeOnboarding.execute(request.identity),
  );
};
