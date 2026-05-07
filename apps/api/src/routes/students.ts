import { db, schema } from '@muvit/db';
import {
  createStudentSchema,
  listStudentsQuerySchema,
  studentSchema,
  updateStudentSchema,
} from '@muvit/validators';
import { and, eq, ilike, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

export const studentsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.requireAuth);

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
    async (req) => {
      const { q, status, limit, offset } = req.query;
      const conds = [eq(schema.students.trainerId, req.user.sub)];
      if (q) conds.push(ilike(schema.students.name, `%${q}%`));
      if (status) conds.push(eq(schema.students.status, status));
      const where = and(...conds);
      const items = await db
        .select()
        .from(schema.students)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(schema.students.name);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.students)
        .where(where);
      return { items, total: count };
    },
  );

  app.post(
    '/students',
    {
      preHandler: [app.requireRole('trainer')],
      schema: { tags: ['students'], body: createStudentSchema, response: { 201: studentSchema } },
    },
    async (req, reply) => {
      const [s] = await db
        .insert(schema.students)
        .values({ ...req.body, trainerId: req.user.sub, isIndependent: false })
        .returning();
      return reply.code(201).send(s);
    },
  );

  app.get(
    '/students/:id',
    {
      schema: {
        tags: ['students'],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: studentSchema },
      },
    },
    async (req, reply) => {
      const s = await db.query.students.findFirst({ where: eq(schema.students.id, req.params.id) });
      if (!s) return reply.code(404).send({ error: 'not found' });
      if (req.user.role === 'trainer' && s.trainerId !== req.user.sub) {
        return reply.code(404).send({ error: 'not found' });
      }
      if (req.user.role === 'student' && s.id !== req.user.sub) {
        return reply.code(403).send({ error: 'forbidden' });
      }
      return s;
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
        response: { 200: studentSchema },
      },
    },
    async (req, reply) => {
      const [s] = await db
        .update(schema.students)
        .set(req.body)
        .where(
          and(eq(schema.students.id, req.params.id), eq(schema.students.trainerId, req.user.sub)),
        )
        .returning();
      if (!s) return reply.code(404).send({ error: 'not found' });
      return s;
    },
  );

  app.delete(
    '/students/:id',
    {
      preHandler: [app.requireRole('trainer')],
      schema: { tags: ['students'], params: z.object({ id: z.string().uuid() }) },
    },
    async (req, reply) => {
      const result = await db
        .delete(schema.students)
        .where(
          and(eq(schema.students.id, req.params.id), eq(schema.students.trainerId, req.user.sub)),
        )
        .returning({ id: schema.students.id });
      if (result.length === 0) return reply.code(404).send({ error: 'not found' });
      return reply.code(204).send();
    },
  );
};
