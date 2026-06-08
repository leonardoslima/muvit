import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { makeTrainerSummaryModule } from '../modules/trainer-summary/factory.js';

const summarySchema = z.object({
  students: z.object({
    total: z.number().int(),
    active: z.number().int(),
    paused: z.number().int(),
    inactive: z.number().int(),
    newThisWeek: z.number().int(),
  }),
  workouts: z.object({
    activePlans: z.number().int(),
  }),
  assessments: z.object({
    last30d: z.number().int(),
  }),
});

export const trainerSummaryRoutes: FastifyPluginAsyncZod = async (app) => {
  const trainerSummaryModule = makeTrainerSummaryModule();

  app.addHook('preHandler', app.requireAuth);

  app.get(
    '/trainer/summary',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        tags: ['trainer'],
        summary: 'Aggregated dashboard summary for the trainer',
        response: { 200: summarySchema },
      },
    },
    async (req) => trainerSummaryModule.getTrainerSummary.execute(req.user.sub),
  );
};
