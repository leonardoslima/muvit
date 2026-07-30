import { db, schema } from '@muvit/db';
import { asc, desc, eq } from 'drizzle-orm';
import type {
  CreateWorkoutPlanData,
  UpdateWorkoutPlanInput,
  WorkoutPlanFullResponse,
  WorkoutPlansRepository,
} from './workout-plans-repository.js';

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

export class DrizzleWorkoutPlansRepository implements WorkoutPlansRepository {
  async create(data: CreateWorkoutPlanData) {
    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(schema.workoutPlans)
        .values({
          studentId: data.studentId,
          trainerId: data.trainerId,
          name: data.name,
          status: data.status,
          startDate: data.startDate ?? null,
          endDate: data.endDate ?? null,
          notes: data.notes ?? null,
        })
        .returning();
      if (!inserted) throw new Error('insert failed');

      for (const day of data.days) {
        const [insertedDay] = await tx
          .insert(schema.workoutDays)
          .values({ planId: inserted.id, label: day.label, dayOrder: day.dayOrder })
          .returning();
        if (!insertedDay) throw new Error('insert failed');

        if (day.exercises.length > 0) {
          await tx.insert(schema.workoutExercises).values(
            day.exercises.map((exercise) => ({
              workoutDayId: insertedDay.id,
              exerciseId: exercise.exerciseId,
              exerciseOrder: exercise.exerciseOrder,
              sets: exercise.sets,
              reps: exercise.reps,
              restSeconds: exercise.restSeconds ?? null,
              loadKg: exercise.loadKg !== undefined ? String(exercise.loadKg) : null,
              tempo: exercise.tempo ?? null,
              notes: exercise.notes ?? null,
            })),
          );
        }
      }

      const result = await tx.query.workoutPlans.findFirst({
        where: eq(schema.workoutPlans.id, inserted.id),
        with: withDaysAndExercises,
      });
      if (!result) throw new Error('find failed');
      return result as WorkoutPlanFullResponse;
    });
  }

  async listForStudent(studentId: string) {
    return db
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
      .where(eq(schema.workoutPlans.studentId, studentId))
      .orderBy(desc(schema.workoutPlans.createdAt));
  }

  async findFullById(id: string) {
    const plan = await db.query.workoutPlans.findFirst({
      where: eq(schema.workoutPlans.id, id),
      with: withDaysAndExercises,
    });
    return (plan as WorkoutPlanFullResponse | undefined) ?? null;
  }

  async findAccessById(id: string) {
    const plan = await db.query.workoutPlans.findFirst({
      where: eq(schema.workoutPlans.id, id),
      columns: { id: true, studentId: true, trainerId: true },
    });
    return plan ?? null;
  }

  async update(id: string, input: UpdateWorkoutPlanInput) {
    return db.transaction(async (tx) => {
      const updateFields: Record<string, unknown> = {};
      if (input.name !== undefined) updateFields.name = input.name;
      if (input.status !== undefined) updateFields.status = input.status;
      if (input.startDate !== undefined) updateFields.startDate = input.startDate;
      if (input.endDate !== undefined) updateFields.endDate = input.endDate;
      if (input.notes !== undefined) updateFields.notes = input.notes;

      if (Object.keys(updateFields).length > 0) {
        await tx
          .update(schema.workoutPlans)
          .set(updateFields)
          .where(eq(schema.workoutPlans.id, id));
      }

      if (input.days !== undefined) {
        await tx.delete(schema.workoutDays).where(eq(schema.workoutDays.planId, id));

        for (const day of input.days) {
          const [insertedDay] = await tx
            .insert(schema.workoutDays)
            .values({ planId: id, label: day.label, dayOrder: day.dayOrder })
            .returning();
          if (!insertedDay) throw new Error('insert failed');

          if (day.exercises.length > 0) {
            await tx.insert(schema.workoutExercises).values(
              day.exercises.map((exercise) => ({
                workoutDayId: insertedDay.id,
                exerciseId: exercise.exerciseId,
                exerciseOrder: exercise.exerciseOrder,
                sets: exercise.sets,
                reps: exercise.reps,
                restSeconds: exercise.restSeconds ?? null,
                loadKg: exercise.loadKg !== undefined ? String(exercise.loadKg) : null,
                tempo: exercise.tempo ?? null,
                notes: exercise.notes ?? null,
              })),
            );
          }
        }
      }

      const plan = await tx.query.workoutPlans.findFirst({
        where: eq(schema.workoutPlans.id, id),
        with: withDaysAndExercises,
      });
      return (plan as WorkoutPlanFullResponse | undefined) ?? null;
    });
  }

  async delete(id: string) {
    await db.delete(schema.workoutPlans).where(eq(schema.workoutPlans.id, id));
  }
}
