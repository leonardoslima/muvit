import {
  finishWorkoutLogSchema,
  listWorkoutLogsQuerySchema,
  startWorkoutLogSchema,
  workoutLogFullSchema,
  workoutLogSummarySchema,
} from '@muvit/validators';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { makeStudentsModule } from '../modules/students/factory.js';
import { makeWorkoutLogsModule } from '../modules/workout-logs/factory.js';
import { sendUseCaseError } from '../shared/http-error.js';

export const workoutLogsRoutes: FastifyPluginAsyncZod = async (app) => {
  const studentsModule = makeStudentsModule();
  const workoutLogsModule = makeWorkoutLogsModule(studentsModule.ensureStudentAccess);

  app.addHook('preHandler', app.requireAuth);

  app.post(
    '/workout-logs',
    {
      schema: {
        tags: ['workout-logs'],
        body: startWorkoutLogSchema,
        response: {
          201: workoutLogSummarySchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const log = await workoutLogsModule.startWorkoutLog.execute(req.identity, req.body);
        return reply.code(201).send(log);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.patch(
    '/workout-logs/:id/finish',
    {
      schema: {
        tags: ['workout-logs'],
        params: z.object({ id: z.string().uuid() }),
        body: finishWorkoutLogSchema,
        response: {
          200: workoutLogFullSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        return await workoutLogsModule.finishWorkoutLog.execute(
          req.identity,
          req.params.id,
          req.body,
        );
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.get(
    '/workout-logs/:id',
    {
      schema: {
        tags: ['workout-logs'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: workoutLogFullSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        return await workoutLogsModule.getWorkoutLog.execute(req.identity, req.params.id);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.get(
    '/students/:studentId/workout-logs',
    {
      schema: {
        tags: ['workout-logs'],
        params: z.object({ studentId: z.string().uuid() }),
        querystring: listWorkoutLogsQuerySchema,
        response: { 200: z.object({ items: z.array(workoutLogSummarySchema) }) },
      },
    },
    async (req, reply) => {
      try {
        return await workoutLogsModule.listWorkoutLogs.execute(
          req.identity,
          req.params.studentId,
          req.query,
        );
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );
};
