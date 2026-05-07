import { db, schema } from '@muvit/db';
import {
  assessmentSchema,
  createAssessmentSchema,
  listAssessmentsQuerySchema,
  updateAssessmentSchema,
} from '@muvit/validators';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loadAccessibleStudent } from '../lib/student-access.js';

export const assessmentsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.requireAuth);

  // GET /students/:studentId/assessments
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
      const student = await loadAccessibleStudent(req, reply, req.params.studentId);
      if (!student) return;

      const { limit, offset } = req.query;
      const where = eq(schema.assessments.studentId, req.params.studentId);

      const items = await db
        .select()
        .from(schema.assessments)
        .where(where)
        .orderBy(desc(schema.assessments.date))
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.assessments)
        .where(where);
      const total = countResult[0]?.count ?? 0;

      return { items, total };
    },
  );

  // POST /students/:studentId/assessments
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
      const student = await loadAccessibleStudent(req, reply, req.params.studentId);
      if (!student) return;

      const { weightKg, heightCm, bodyFatPct, ...rest } = req.body;
      const [a] = await db
        .insert(schema.assessments)
        .values({
          ...rest,
          studentId: req.params.studentId,
          weightKg: weightKg !== undefined ? String(weightKg) : null,
          heightCm: heightCm !== undefined ? String(heightCm) : null,
          bodyFatPct: bodyFatPct !== undefined ? String(bodyFatPct) : null,
        })
        .returning();
      if (!a) throw new Error('insert failed');

      return reply.code(201).send(a);
    },
  );

  // GET /assessments/:id
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
      const a = await db.query.assessments.findFirst({
        where: eq(schema.assessments.id, req.params.id),
      });
      if (!a) return reply.code(404).send({ error: 'not found' });

      const student = await loadAccessibleStudent(req, reply, a.studentId);
      if (!student) return;

      return a;
    },
  );

  // PATCH /assessments/:id
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
      const existing = await db.query.assessments.findFirst({
        where: eq(schema.assessments.id, req.params.id),
      });
      if (!existing) return reply.code(404).send({ error: 'not found' });

      const student = await loadAccessibleStudent(req, reply, existing.studentId);
      if (!student) return;

      const { weightKg, heightCm, bodyFatPct, ...restBody } = req.body;
      const updateValues: Record<string, unknown> = { ...restBody };
      if (weightKg !== undefined) updateValues.weightKg = String(weightKg);
      if (heightCm !== undefined) updateValues.heightCm = String(heightCm);
      if (bodyFatPct !== undefined) updateValues.bodyFatPct = String(bodyFatPct);

      const [a] = await db
        .update(schema.assessments)
        .set(updateValues)
        .where(and(eq(schema.assessments.id, req.params.id)))
        .returning();
      if (!a) throw new Error('update failed');

      return a;
    },
  );

  // DELETE /assessments/:id
  app.delete(
    '/assessments/:id',
    {
      schema: {
        tags: ['assessments'],
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (req, reply) => {
      const existing = await db.query.assessments.findFirst({
        where: eq(schema.assessments.id, req.params.id),
      });
      if (!existing) return reply.code(404).send({ error: 'not found' });

      const student = await loadAccessibleStudent(req, reply, existing.studentId);
      if (!student) return;

      await db.delete(schema.assessments).where(eq(schema.assessments.id, req.params.id));

      return reply.code(204).send();
    },
  );
};
