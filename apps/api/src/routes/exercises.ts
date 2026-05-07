import { db, schema } from '@muvit/db';
import {
  createExerciseSchema,
  exerciseSchema,
  listExercisesQuerySchema,
  updateExerciseSchema,
} from '@muvit/validators';
import { and, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

export const exercisesRoutes: FastifyPluginAsyncZod = async (app) => {
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
    async (req) => {
      const { q, muscleGroup, scope, limit, offset } = req.query;
      const conds = [];
      if (scope === 'global') conds.push(isNull(schema.exercises.trainerId));
      else if (scope === 'mine' && req.user.role === 'trainer')
        conds.push(eq(schema.exercises.trainerId, req.user.sub));
      else if (scope === 'all' && req.user.role === 'trainer') {
        const expr = or(
          isNull(schema.exercises.trainerId),
          eq(schema.exercises.trainerId, req.user.sub),
        );
        if (expr) conds.push(expr);
      } else {
        conds.push(isNull(schema.exercises.trainerId));
      }
      if (q) conds.push(ilike(schema.exercises.name, `%${q}%`));
      if (muscleGroup) conds.push(eq(schema.exercises.muscleGroup, muscleGroup));
      const where = and(...conds);
      const items = await db
        .select()
        .from(schema.exercises)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(schema.exercises.name);
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.exercises)
        .where(where);
      const total = countResult[0]?.count ?? 0;
      return { items, total };
    },
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
      const [e] = await db
        .insert(schema.exercises)
        .values({ ...req.body, trainerId: req.user.sub })
        .returning();
      if (!e) throw new Error('insert failed');
      return reply.code(201).send(e);
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
      const [e] = await db
        .update(schema.exercises)
        .set(req.body)
        .where(
          and(eq(schema.exercises.id, req.params.id), eq(schema.exercises.trainerId, req.user.sub)),
        )
        .returning();
      if (!e) return reply.code(404).send({ error: 'not found' });
      return e;
    },
  );

  app.delete(
    '/exercises/:id',
    {
      preHandler: [app.requireRole('trainer')],
      schema: { tags: ['exercises'], params: z.object({ id: z.string().uuid() }) },
    },
    async (req, reply) => {
      const r = await db
        .delete(schema.exercises)
        .where(
          and(eq(schema.exercises.id, req.params.id), eq(schema.exercises.trainerId, req.user.sub)),
        )
        .returning({ id: schema.exercises.id });
      if (r.length === 0) return reply.code(404).send({ error: 'not found' });
      return reply.code(204).send();
    },
  );
};
