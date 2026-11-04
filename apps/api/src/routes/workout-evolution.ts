import {
  updateWorkoutGoalSchema,
  workoutEvolutionQuerySchema,
  workoutEvolutionSchema,
  workoutGoalSchema,
} from '@muvit/validators';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { makeWorkoutEvolutionModule } from '../modules/workout-evolution/factory.js';

export const workoutEvolutionRoutes: FastifyPluginAsyncZod = async (app) => {
  const module = makeWorkoutEvolutionModule();

  app.addHook('preHandler', app.requireAuth);
  app.addHook('preHandler', app.requireRole('student'));

  app.get(
    '/students/me/workout-evolution',
    {
      schema: {
        tags: ['students'],
        summary: 'Resumo da evolução dos treinos do aluno',
        querystring: workoutEvolutionQuerySchema,
        response: { 200: workoutEvolutionSchema },
      },
    },
    async (req) => module.getWorkoutEvolution.execute(req.identity.profileId, req.query),
  );

  app.get(
    '/students/me/workout-goal',
    {
      schema: {
        tags: ['students'],
        summary: 'Meta semanal de treinos do aluno',
        response: { 200: workoutGoalSchema },
      },
    },
    async (req) => module.getWorkoutGoal.execute(req.identity.profileId),
  );

  app.patch(
    '/students/me/workout-goal',
    {
      schema: {
        tags: ['students'],
        summary: 'Configurar ou remover a meta semanal de treinos',
        body: updateWorkoutGoalSchema,
        response: { 200: workoutGoalSchema },
      },
    },
    async (req) => module.updateWorkoutGoal.execute(req.identity.profileId, req.body),
  );
};
