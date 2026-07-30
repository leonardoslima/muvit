import {
  createExerciseSchema,
  exerciseSchema,
  listExercisesQuerySchema,
  updateExerciseSchema,
} from '@muvit/validators';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { makeExercisesModule } from '../modules/exercises/factory.js';
import { sendUseCaseError } from '../shared/http-error.js';

export const exercisesRoutes: FastifyPluginAsyncZod = async (app) => {
  const exercisesModule = makeExercisesModule();

  app.addHook('preHandler', app.requireAuth);

  app.get(
    '/exercises',
    {
      schema: {
        tags: ['exercises'],
        querystring: listExercisesQuerySchema,
        response: { 200: z.object({ items: z.array(exerciseSchema), total: z.number() }) },
      },
    },
    async (req) => exercisesModule.listExercises.execute(req.identity, req.query),
  );

  app.post(
    '/exercises',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        tags: ['exercises'],
        body: createExerciseSchema,
        response: { 201: exerciseSchema },
      },
    },
    async (req, reply) => {
      const exercise = await exercisesModule.createExercise.execute(
        req.identity.profileId,
        req.body,
      );
      return reply.code(201).send(exercise);
    },
  );

  app.patch(
    '/exercises/:id',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        tags: ['exercises'],
        params: z.object({ id: z.string().uuid() }),
        body: updateExerciseSchema,
        response: {
          200: exerciseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        return await exercisesModule.updateExercise.execute(
          req.params.id,
          req.identity.profileId,
          req.body,
        );
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.delete(
    '/exercises/:id',
    {
      preHandler: [app.requireRole('trainer')],
      schema: { tags: ['exercises'], params: z.object({ id: z.string().uuid() }) },
    },
    async (req, reply) => {
      try {
        await exercisesModule.deleteExercise.execute(req.params.id, req.identity.profileId);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
      return reply.code(204).send();
    },
  );
};
