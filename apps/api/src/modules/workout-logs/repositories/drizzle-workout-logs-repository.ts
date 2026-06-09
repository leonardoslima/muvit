import { db, schema } from '@muvit/db';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import type {
  FinishWorkoutLogInput,
  ListWorkoutLogsQuery,
  StartWorkoutLogInput,
  WorkoutLogFullResponse,
  WorkoutLogsRepository,
} from './workout-logs-repository.js';

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

type FullLogRow = {
  id: string;
  studentId: string;
  workoutDayId: string;
  date: string;
  durationMin: number | null;
  rpe: number | null;
  notes: string | null;
  completed: boolean;
  createdAt: Date;
  sets: Array<{
    id: string;
    workoutLogId: string;
    workoutExerciseId: string;
    setNumber: number;
    repsDone: number | null;
    loadKg: string | null;
    completed: boolean;
    exercise: {
      exercise: {
        id: string;
        name: string;
      };
    };
  }>;
};

function shapeFullLog(log: FullLogRow | null | undefined): WorkoutLogFullResponse | null {
  if (!log) return null;
  return {
    ...log,
    sets: log.sets.map((set) => ({
      id: set.id,
      workoutLogId: set.workoutLogId,
      workoutExerciseId: set.workoutExerciseId,
      setNumber: set.setNumber,
      repsDone: set.repsDone,
      loadKg: set.loadKg,
      completed: set.completed,
      exercise: {
        id: set.exercise.exercise.id,
        name: set.exercise.exercise.name,
      },
    })),
  };
}

export class DrizzleWorkoutLogsRepository implements WorkoutLogsRepository {
  async findWorkoutDayAccess(workoutDayId: string) {
    const day = await db.query.workoutDays.findFirst({
      where: eq(schema.workoutDays.id, workoutDayId),
      columns: { id: true },
      with: { plan: { columns: { studentId: true } } },
    });
    if (!day) return null;
    return { id: day.id, studentId: day.plan.studentId };
  }

  async start(studentId: string, input: StartWorkoutLogInput) {
    const [log] = await db
      .insert(schema.workoutLogs)
      .values({
        studentId,
        workoutDayId: input.workoutDayId,
        date: input.date,
        completed: false,
      })
      .returning();
    if (!log) throw new Error('insert failed');
    return log;
  }

  async findById(id: string) {
    const log = await db.query.workoutLogs.findFirst({
      where: eq(schema.workoutLogs.id, id),
      columns: { id: true, studentId: true },
    });
    return log ?? null;
  }

  async finish(id: string, input: FinishWorkoutLogInput) {
    const result = await db.transaction(async (tx) => {
      const claimed = await tx
        .update(schema.workoutLogs)
        .set({
          durationMin: input.durationMin,
          rpe: input.rpe ?? null,
          notes: input.notes ?? null,
          completed: true,
        })
        .where(and(eq(schema.workoutLogs.id, id), eq(schema.workoutLogs.completed, false)))
        .returning({ id: schema.workoutLogs.id });

      if (claimed.length === 0) return null;

      await tx.insert(schema.logSets).values(
        input.sets.map((set) => ({
          workoutLogId: id,
          workoutExerciseId: set.workoutExerciseId,
          setNumber: set.setNumber,
          repsDone: set.repsDone ?? null,
          loadKg: set.loadKg !== undefined ? String(set.loadKg) : null,
          completed: set.completed,
        })),
      );

      return tx.query.workoutLogs.findFirst({
        where: eq(schema.workoutLogs.id, id),
        with: withSetsAndExercise,
      });
    });

    return shapeFullLog(result);
  }

  async findFullById(id: string) {
    const log = await db.query.workoutLogs.findFirst({
      where: eq(schema.workoutLogs.id, id),
      with: withSetsAndExercise,
    });
    return shapeFullLog(log);
  }

  async listForStudent(studentId: string, query: ListWorkoutLogsQuery) {
    const { from, to, limit, offset } = query;
    const conditions = [eq(schema.workoutLogs.studentId, studentId)];
    if (from) conditions.push(gte(schema.workoutLogs.date, from));
    if (to) conditions.push(lte(schema.workoutLogs.date, to));

    return db
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
  }
}
