import {
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
  workoutPlanFullSchema,
  workoutPlanSummarySchema,
} from '@muvit/validators';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { makeStudentsModule } from '../modules/students/factory.js';
import { makeWorkoutsModule } from '../modules/workouts/factory.js';
import { sendUseCaseError } from '../shared/http-error.js';

export const workoutsRoutes: FastifyPluginAsyncZod = async (app) => {
  const studentsModule = makeStudentsModule();
  const workoutsModule = makeWorkoutsModule(studentsModule.ensureStudentAccess);

  app.addHook('preHandler', app.requireAuth);

  app.post(
    '/workout-plans',
    {
      schema: {
        tags: ['workout-plans'],
        body: createWorkoutPlanSchema,
        response: { 201: workoutPlanFullSchema },
      },
    },
    async (req, reply) => {
      try {
        const plan = await workoutsModule.createWorkoutPlan.execute(req.user, req.body);
        return reply.code(201).send(plan);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.get(
    '/students/:studentId/workout-plans',
    {
      schema: {
        tags: ['workout-plans'],
        params: z.object({ studentId: z.string().uuid() }),
        response: { 200: z.object({ items: z.array(workoutPlanSummarySchema) }) },
      },
    },
    async (req, reply) => {
      try {
        return await workoutsModule.listWorkoutPlans.execute(req.user, req.params.studentId);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.get(
    '/workout-plans/:id',
    {
      schema: {
        tags: ['workout-plans'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: workoutPlanFullSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        return await workoutsModule.getWorkoutPlan.execute(req.user, req.params.id);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.patch(
    '/workout-plans/:id',
    {
      schema: {
        tags: ['workout-plans'],
        params: z.object({ id: z.string().uuid() }),
        body: updateWorkoutPlanSchema,
        response: {
          200: workoutPlanFullSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        return await workoutsModule.updateWorkoutPlan.execute(req.user, req.params.id, req.body);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.delete(
    '/workout-plans/:id',
    {
      schema: {
        tags: ['workout-plans'],
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (req, reply) => {
      try {
        await workoutsModule.deleteWorkoutPlan.execute(req.user, req.params.id);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
      return reply.code(204).send();
    },
  );
};
