import {
  createStudentSchema,
  listStudentsQuerySchema,
  studentSchema,
  updateStudentSchema,
} from '@muvit/validators';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { makeStudentsModule } from '../modules/students/factory.js';
import { sendUseCaseError } from '../shared/http-error.js';

export const studentsRoutes: FastifyPluginAsyncZod = async (app) => {
  const studentsModule = makeStudentsModule();

  app.addHook('preHandler', app.requireAuth);

  app.post(
    '/students/me/push-token',
    {
      preHandler: [app.requireRole('student')],
      schema: {
        tags: ['students'],
        body: z.object({ token: z.string().min(1).max(255) }),
        response: { 204: z.undefined() },
      },
    },
    async (req, reply) => {
      await studentsModule.registerStudentPushToken.execute(req.identity.profileId, req.body.token);
      return reply.code(204).send();
    },
  );

  app.get(
    '/students',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        tags: ['students'],
        querystring: listStudentsQuerySchema,
        response: { 200: z.object({ items: z.array(studentSchema), total: z.number() }) },
      },
    },
    async (req) => studentsModule.listStudents.execute(req.identity.profileId, req.query),
  );

  app.post(
    '/students',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        tags: ['students'],
        body: createStudentSchema,
        response: {
          201: studentSchema,
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const student = await studentsModule.createStudent.execute(
          req.identity.profileId,
          req.body,
        );
        return reply.code(201).send(student);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.get(
    '/students/:id',
    {
      schema: {
        tags: ['students'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: studentSchema,
          404: z.object({ error: z.string() }),
          403: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        return await studentsModule.getStudent.execute(req.identity, req.params.id);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.patch(
    '/students/:id',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        tags: ['students'],
        params: z.object({ id: z.string().uuid() }),
        body: updateStudentSchema,
        response: {
          200: studentSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        return await studentsModule.updateStudent.execute(
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
    '/students/:id',
    {
      preHandler: [app.requireRole('trainer')],
      schema: { tags: ['students'], params: z.object({ id: z.string().uuid() }) },
    },
    async (req, reply) => {
      try {
        await studentsModule.deleteStudent.execute(req.params.id, req.identity.profileId);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
      return reply.code(204).send();
    },
  );
};
