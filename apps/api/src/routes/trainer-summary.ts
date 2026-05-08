import { db, schema } from '@muvit/db';
import { and, eq, gte, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const summarySchema = z.object({
  students: z.object({
    total: z.number().int(),
    active: z.number().int(),
    paused: z.number().int(),
    inactive: z.number().int(),
    newThisWeek: z.number().int(),
  }),
  workouts: z.object({
    activePlans: z.number().int(),
  }),
  assessments: z.object({
    last30d: z.number().int(),
  }),
});

export const trainerSummaryRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.requireAuth);

  app.get(
    '/trainer/summary',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        tags: ['trainer'],
        summary: 'Aggregated dashboard summary for the trainer',
        response: { 200: summarySchema },
      },
    },
    async (req) => {
      const trainerId = req.user.sub;
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const studentsRows = await db
        .select({ status: schema.students.status, createdAt: schema.students.createdAt })
        .from(schema.students)
        .where(eq(schema.students.trainerId, trainerId));

      const total = studentsRows.length;
      const active = studentsRows.filter((s) => s.status === 'active').length;
      const paused = studentsRows.filter((s) => s.status === 'paused').length;
      const inactive = studentsRows.filter((s) => s.status === 'inactive').length;
      const newThisWeek = studentsRows.filter((s) => s.createdAt >= since7d).length;

      const activePlansRow = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(schema.workoutPlans)
        .where(
          and(
            eq(schema.workoutPlans.trainerId, trainerId),
            eq(schema.workoutPlans.status, 'active'),
          ),
        );
      const activePlans = activePlansRow[0]?.c ?? 0;

      const last30dRow = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(schema.assessments)
        .innerJoin(schema.students, eq(schema.students.id, schema.assessments.studentId))
        .where(
          and(eq(schema.students.trainerId, trainerId), gte(schema.assessments.createdAt, since30d)),
        );
      const last30d = last30dRow[0]?.c ?? 0;

      return {
        students: { total, active, paused, inactive, newThisWeek },
        workouts: { activePlans },
        assessments: { last30d },
      };
    },
  );
};
