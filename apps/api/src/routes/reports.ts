import { reportQuerySchema, studentReportSchema } from '@muvit/validators';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { makeReportsModule } from '../modules/reports/factory.js';
import { makeStudentsModule } from '../modules/students/factory.js';
import { sendUseCaseError } from '../shared/http-error.js';

export const reportsRoutes: FastifyPluginAsyncZod = async (app) => {
  const studentsModule = makeStudentsModule();
  const reportsModule = makeReportsModule(studentsModule.ensureStudentAccess);

  app.addHook('preHandler', app.requireAuth);

  app.get(
    '/reports/students/:studentId',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        operationId: 'getStudentReport',
        tags: ['reports'],
        params: z.object({ studentId: z.string().uuid() }),
        querystring: reportQuerySchema,
        response: { 200: studentReportSchema },
      },
    },
    async (request, reply) => {
      try {
        return await reportsModule.getStudentReport.execute(
          request.identity,
          request.params.studentId,
          request.query,
        );
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );
};
