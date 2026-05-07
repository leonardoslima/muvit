import { db, schema } from '@muvit/db';
import {
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
  workoutPlanFullSchema,
  workoutPlanSummarySchema,
} from '@muvit/validators';
import { asc, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loadAccessibleStudent } from '../lib/student-access.js';

const withDaysAndExercises = {
  days: {
    orderBy: [asc(schema.workoutDays.dayOrder)],
    with: {
      exercises: {
        orderBy: [asc(schema.workoutExercises.exerciseOrder)],
        with: {
          exercise: true as const,
        },
      },
    },
  },
};

export const workoutsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.requireAuth);

  // POST /workout-plans
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
      const body = req.body;

      const student = await loadAccessibleStudent(req, reply, body.studentId);
      if (!student) return;

      const trainerId = req.user.role === 'trainer' ? req.user.sub : null;

      const plan = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(schema.workoutPlans)
          .values({
            studentId: body.studentId,
            trainerId,
            name: body.name,
            status: body.status,
            startDate: body.startDate ?? null,
            endDate: body.endDate ?? null,
            notes: body.notes ?? null,
          })
          .returning();
        if (!inserted) throw new Error('insert failed');

        for (const day of body.days) {
          const [insertedDay] = await tx
            .insert(schema.workoutDays)
            .values({
              planId: inserted.id,
              label: day.label,
              dayOrder: day.dayOrder,
            })
            .returning();
          if (!insertedDay) throw new Error('insert failed');

          if (day.exercises.length > 0) {
            await tx.insert(schema.workoutExercises).values(
              day.exercises.map((ex) => ({
                workoutDayId: insertedDay.id,
                exerciseId: ex.exerciseId,
                exerciseOrder: ex.exerciseOrder,
                sets: ex.sets,
                reps: ex.reps,
                restSeconds: ex.restSeconds ?? null,
                loadKg: ex.loadKg !== undefined ? String(ex.loadKg) : null,
                tempo: ex.tempo ?? null,
                notes: ex.notes ?? null,
              })),
            );
          }
        }

        const result = await tx.query.workoutPlans.findFirst({
          where: eq(schema.workoutPlans.id, inserted.id),
          with: withDaysAndExercises,
        });
        if (!result) throw new Error('find failed');
        return result;
      });

      return reply.code(201).send(plan);
    },
  );

  // GET /students/:studentId/workout-plans
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
      const student = await loadAccessibleStudent(req, reply, req.params.studentId);
      if (!student) return;

      const items = await db
        .select({
          id: schema.workoutPlans.id,
          studentId: schema.workoutPlans.studentId,
          trainerId: schema.workoutPlans.trainerId,
          name: schema.workoutPlans.name,
          startDate: schema.workoutPlans.startDate,
          endDate: schema.workoutPlans.endDate,
          status: schema.workoutPlans.status,
          createdAt: schema.workoutPlans.createdAt,
        })
        .from(schema.workoutPlans)
        .where(eq(schema.workoutPlans.studentId, req.params.studentId))
        .orderBy(desc(schema.workoutPlans.createdAt));

      return { items };
    },
  );

  // GET /workout-plans/:id
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
      const plan = await db.query.workoutPlans.findFirst({
        where: eq(schema.workoutPlans.id, req.params.id),
        with: withDaysAndExercises,
      });
      if (!plan) return reply.code(404).send({ error: 'not found' });

      const student = await loadAccessibleStudent(req, reply, plan.studentId);
      if (!student) return;

      // Defense in depth: trainers can only access their own plans
      if (req.user.role === 'trainer' && plan.trainerId !== req.user.sub) {
        return reply.code(404).send({ error: 'not found' });
      }
      if (
        req.user.role === 'student' &&
        plan.trainerId !== null &&
        plan.studentId !== req.user.sub
      ) {
        return reply.code(404).send({ error: 'not found' });
      }

      return plan;
    },
  );

  // PATCH /workout-plans/:id
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
      const existing = await db.query.workoutPlans.findFirst({
        where: eq(schema.workoutPlans.id, req.params.id),
      });
      if (!existing) return reply.code(404).send({ error: 'not found' });

      const student = await loadAccessibleStudent(req, reply, existing.studentId);
      if (!student) return;

      // Defense in depth
      if (req.user.role === 'trainer' && existing.trainerId !== req.user.sub) {
        return reply.code(404).send({ error: 'not found' });
      }
      if (
        req.user.role === 'student' &&
        existing.trainerId !== null &&
        existing.studentId !== req.user.sub
      ) {
        return reply.code(404).send({ error: 'not found' });
      }

      const body = req.body;

      const updated = await db.transaction(async (tx) => {
        // Update top-level fields if provided
        const updateFields: Record<string, unknown> = {};
        if (body.name !== undefined) updateFields.name = body.name;
        if (body.status !== undefined) updateFields.status = body.status;
        if (body.startDate !== undefined) updateFields.startDate = body.startDate;
        if (body.endDate !== undefined) updateFields.endDate = body.endDate;
        if (body.notes !== undefined) updateFields.notes = body.notes;

        if (Object.keys(updateFields).length > 0) {
          await tx
            .update(schema.workoutPlans)
            .set(updateFields)
            .where(eq(schema.workoutPlans.id, req.params.id));
        }

        // If days provided, delete existing and recreate
        if (body.days !== undefined) {
          await tx.delete(schema.workoutDays).where(eq(schema.workoutDays.planId, req.params.id));

          for (const day of body.days) {
            const [insertedDay] = await tx
              .insert(schema.workoutDays)
              .values({
                planId: req.params.id,
                label: day.label,
                dayOrder: day.dayOrder,
              })
              .returning();
            if (!insertedDay) throw new Error('insert failed');

            if (day.exercises.length > 0) {
              await tx.insert(schema.workoutExercises).values(
                day.exercises.map((ex) => ({
                  workoutDayId: insertedDay.id,
                  exerciseId: ex.exerciseId,
                  exerciseOrder: ex.exerciseOrder,
                  sets: ex.sets,
                  reps: ex.reps,
                  restSeconds: ex.restSeconds ?? null,
                  loadKg: ex.loadKg !== undefined ? String(ex.loadKg) : null,
                  tempo: ex.tempo ?? null,
                  notes: ex.notes ?? null,
                })),
              );
            }
          }
        }

        return tx.query.workoutPlans.findFirst({
          where: eq(schema.workoutPlans.id, req.params.id),
          with: withDaysAndExercises,
        });
      });

      return updated;
    },
  );

  // DELETE /workout-plans/:id
  app.delete(
    '/workout-plans/:id',
    {
      schema: {
        tags: ['workout-plans'],
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (req, reply) => {
      const existing = await db.query.workoutPlans.findFirst({
        where: eq(schema.workoutPlans.id, req.params.id),
      });
      if (!existing) return reply.code(404).send({ error: 'not found' });

      const student = await loadAccessibleStudent(req, reply, existing.studentId);
      if (!student) return;

      // Defense in depth
      if (req.user.role === 'trainer' && existing.trainerId !== req.user.sub) {
        return reply.code(404).send({ error: 'not found' });
      }
      if (
        req.user.role === 'student' &&
        existing.trainerId !== null &&
        existing.studentId !== req.user.sub
      ) {
        return reply.code(404).send({ error: 'not found' });
      }

      await db.delete(schema.workoutPlans).where(eq(schema.workoutPlans.id, req.params.id));

      return reply.code(204).send();
    },
  );
};
