import { db, schema } from '@muvit/db';
import {
  finishWorkoutLogSchema,
  listWorkoutLogsQuerySchema,
  startWorkoutLogSchema,
  workoutLogFullSchema,
  workoutLogSummarySchema,
} from '@muvit/validators';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loadAccessibleStudent } from '../lib/student-access.js';

const withSetsAndExercise = {
  sets: {
    orderBy: [asc(schema.logSets.setNumber)],
    with: {
      exercise: {
        with: {
          exercise: true as const,
        },
      },
    },
  },
};

export const workoutLogsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.requireAuth);

  // POST /workout-logs — student starts a log
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
      const { workoutDayId, date } = req.body;

      // Find the workout day and its plan
      const day = await db.query.workoutDays.findFirst({
        where: eq(schema.workoutDays.id, workoutDayId),
        with: { plan: true },
      });

      if (!day) return reply.code(404).send({ error: 'not found' });

      // Verify the requester has access to the student who owns this plan
      const student = await loadAccessibleStudent(req, reply, day.plan.studentId);
      if (!student) return;

      const [log] = await db
        .insert(schema.workoutLogs)
        .values({
          studentId: day.plan.studentId,
          workoutDayId,
          date,
          completed: false,
        })
        .returning();
      if (!log) throw new Error('insert failed');

      return reply.code(201).send(log);
    },
  );

  // PATCH /workout-logs/:id/finish — student finishes a log with sets
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
      const log = await db.query.workoutLogs.findFirst({
        where: eq(schema.workoutLogs.id, req.params.id),
      });

      if (!log) return reply.code(404).send({ error: 'not found' });

      const student = await loadAccessibleStudent(req, reply, log.studentId);
      if (!student) return;

      const { durationMin, rpe, notes, sets } = req.body;

      const result = await db.transaction(async (tx) => {
        // Atomically claim the log: only succeeds if completed=false. Concurrent finishes lose the race.
        const claimed = await tx
          .update(schema.workoutLogs)
          .set({
            durationMin,
            rpe: rpe ?? null,
            notes: notes ?? null,
            completed: true,
          })
          .where(and(eq(schema.workoutLogs.id, log.id), eq(schema.workoutLogs.completed, false)))
          .returning({ id: schema.workoutLogs.id });

        if (claimed.length === 0) return null;

        await tx.insert(schema.logSets).values(
          sets.map((s) => ({
            workoutLogId: log.id,
            workoutExerciseId: s.workoutExerciseId,
            setNumber: s.setNumber,
            repsDone: s.repsDone ?? null,
            loadKg: s.loadKg !== undefined ? String(s.loadKg) : null,
            completed: s.completed,
          })),
        );

        return tx.query.workoutLogs.findFirst({
          where: eq(schema.workoutLogs.id, log.id),
          with: withSetsAndExercise,
        });
      });

      if (result === null) return reply.code(409).send({ error: 'log already completed' });
      const fullLog = result;
      if (!fullLog) throw new Error('failed to load log after finish');

      // Flatten the nested structure: logSet.exercise (workoutExercise) -> exercise (exercise)
      const shaped = {
        ...fullLog,
        sets: fullLog.sets.map((s) => ({
          id: s.id,
          workoutLogId: s.workoutLogId,
          workoutExerciseId: s.workoutExerciseId,
          setNumber: s.setNumber,
          repsDone: s.repsDone,
          loadKg: s.loadKg,
          completed: s.completed,
          exercise: {
            id: s.exercise.exercise.id,
            name: s.exercise.exercise.name,
          },
        })),
      };

      return shaped;
    },
  );

  // GET /workout-logs/:id — load a specific log
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
      const log = await db.query.workoutLogs.findFirst({
        where: eq(schema.workoutLogs.id, req.params.id),
        with: withSetsAndExercise,
      });

      if (!log) return reply.code(404).send({ error: 'not found' });

      const student = await loadAccessibleStudent(req, reply, log.studentId);
      if (!student) return;

      const shaped = {
        ...log,
        sets: log.sets.map((s) => ({
          id: s.id,
          workoutLogId: s.workoutLogId,
          workoutExerciseId: s.workoutExerciseId,
          setNumber: s.setNumber,
          repsDone: s.repsDone,
          loadKg: s.loadKg,
          completed: s.completed,
          exercise: {
            id: s.exercise.exercise.id,
            name: s.exercise.exercise.name,
          },
        })),
      };

      return shaped;
    },
  );

  // GET /students/:studentId/workout-logs?from=&to=&limit=&offset=
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
      const student = await loadAccessibleStudent(req, reply, req.params.studentId);
      if (!student) return;

      const { from, to, limit, offset } = req.query;

      const conditions = [eq(schema.workoutLogs.studentId, req.params.studentId)];
      if (from) conditions.push(gte(schema.workoutLogs.date, from));
      if (to) conditions.push(lte(schema.workoutLogs.date, to));

      const items = await db
        .select({
          id: schema.workoutLogs.id,
          studentId: schema.workoutLogs.studentId,
          workoutDayId: schema.workoutLogs.workoutDayId,
          date: schema.workoutLogs.date,
          durationMin: schema.workoutLogs.durationMin,
          rpe: schema.workoutLogs.rpe,
          completed: schema.workoutLogs.completed,
          createdAt: schema.workoutLogs.createdAt,
        })
        .from(schema.workoutLogs)
        .where(and(...conditions))
        .orderBy(desc(schema.workoutLogs.date))
        .limit(limit)
        .offset(offset);

      return { items };
    },
  );
};
