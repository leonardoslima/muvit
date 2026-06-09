import {
  assessmentSchema,
  createAssessmentSchema,
  listAssessmentsQuerySchema,
  updateAssessmentSchema,
} from '@muvit/validators';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { makeAssessmentsModule } from '../modules/assessments/factory.js';
import { makeStudentsModule } from '../modules/students/factory.js';
import { sendUseCaseError } from '../shared/http-error.js';

export const assessmentsRoutes: FastifyPluginAsyncZod = async (app) => {
  const studentsModule = makeStudentsModule();
  const assessmentsModule = makeAssessmentsModule(studentsModule.ensureStudentAccess);

  app.addHook('preHandler', app.requireAuth);

  app.get(
    '/students/:studentId/assessments',
    {
      schema: {
        tags: ['assessments'],
        params: z.object({ studentId: z.string().uuid() }),
        querystring: listAssessmentsQuerySchema,
        response: {
          200: z.object({ items: z.array(assessmentSchema), total: z.number() }),
        },
      },
    },
    async (req, reply) => {
      try {
        return await assessmentsModule.listAssessments.execute(
          req.user,
          req.params.studentId,
          req.query,
        );
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.post(
    '/students/:studentId/assessments',
    {
      schema: {
        tags: ['assessments'],
        params: z.object({ studentId: z.string().uuid() }),
        body: createAssessmentSchema,
        response: { 201: assessmentSchema },
      },
    },
    async (req, reply) => {
      try {
        const assessment = await assessmentsModule.createAssessment.execute(
          req.user,
          req.params.studentId,
          req.body,
        );
        return reply.code(201).send(assessment);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.get(
    '/assessments/:id',
    {
      schema: {
        tags: ['assessments'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: assessmentSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        return await assessmentsModule.getAssessment.execute(req.user, req.params.id);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.patch(
    '/assessments/:id',
    {
      schema: {
        tags: ['assessments'],
        params: z.object({ id: z.string().uuid() }),
        body: updateAssessmentSchema,
        response: {
          200: assessmentSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        return await assessmentsModule.updateAssessment.execute(req.user, req.params.id, req.body);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.delete(
    '/assessments/:id',
    {
      schema: {
        tags: ['assessments'],
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (req, reply) => {
      try {
        await assessmentsModule.deleteAssessment.execute(req.user, req.params.id);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
      return reply.code(204).send();
    },
  );
};
