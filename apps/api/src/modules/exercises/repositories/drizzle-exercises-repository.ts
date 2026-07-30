import { db, schema } from '@muvit/db';
import { and, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type {
  CreateExerciseInput,
  ExerciseListParams,
  ExercisesRepository,
  UpdateExerciseInput,
} from './exercises-repository.js';

export class DrizzleExercisesRepository implements ExercisesRepository {
  async list(params: ExerciseListParams) {
    const { q, muscleGroup, scope, limit, offset, identity } = params;
    const conds = [];

    if (scope === 'global') {
      conds.push(isNull(schema.exercises.trainerId));
    } else if (scope === 'mine') {
      conds.push(eq(schema.exercises.trainerId, identity.profileId));
    } else {
      const visibleExercises = or(
        isNull(schema.exercises.trainerId),
        eq(schema.exercises.trainerId, identity.profileId),
      );
      if (visibleExercises) conds.push(visibleExercises);
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

    return { items, total: countResult[0]?.count ?? 0 };
  }

  async create(trainerId: string, input: CreateExerciseInput) {
    const [exercise] = await db
      .insert(schema.exercises)
      .values({ ...input, trainerId })
      .returning();
    if (!exercise) throw new Error('insert failed');
    return exercise;
  }

  async updateForTrainer(id: string, trainerId: string, input: UpdateExerciseInput) {
    const [exercise] = await db
      .update(schema.exercises)
      .set(input)
      .where(and(eq(schema.exercises.id, id), eq(schema.exercises.trainerId, trainerId)))
      .returning();
    return exercise ?? null;
  }

  async deleteForTrainer(id: string, trainerId: string) {
    const result = await db
      .delete(schema.exercises)
      .where(and(eq(schema.exercises.id, id), eq(schema.exercises.trainerId, trainerId)))
      .returning({ id: schema.exercises.id });
    return result.length > 0;
  }
}
