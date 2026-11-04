import { db, schema } from '@muvit/db';
import { and, eq, ilike, ne, sql } from 'drizzle-orm';
import { getTrainerPlanDatabase } from '../../trainer-plan/repositories/drizzle-trainer-plan-mutation-lock.js';
import type {
  CreateStudentInput,
  ListStudentsQuery,
  StudentsRepository,
  UpdateStudentInput,
} from './students-repository.js';

export class DrizzleStudentsRepository implements StudentsRepository {
  async findById(id: string) {
    return (await db.query.students.findFirst({ where: eq(schema.students.id, id) })) ?? null;
  }

  async listForTrainer(trainerId: string, query: ListStudentsQuery) {
    const { q, status, limit, offset } = query;
    const conds = [eq(schema.students.trainerId, trainerId)];
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
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.students)
      .where(where);

    return { items, total: countResult[0]?.count ?? 0 };
  }

  async createForTrainer(trainerId: string, input: CreateStudentInput) {
    const [student] = await getTrainerPlanDatabase()
      .insert(schema.students)
      .values({ ...input, trainerId, isIndependent: false })
      .returning();
    if (!student) throw new Error('insert failed');
    return student;
  }

  async updateForTrainer(id: string, trainerId: string, input: UpdateStudentInput) {
    const [student] = await getTrainerPlanDatabase()
      .update(schema.students)
      .set(input)
      .where(and(eq(schema.students.id, id), eq(schema.students.trainerId, trainerId)))
      .returning();
    return student ?? null;
  }

  async findStatusForTrainer(id: string, trainerId: string) {
    const student = await getTrainerPlanDatabase().query.students.findFirst({
      columns: { status: true },
      where: and(eq(schema.students.id, id), eq(schema.students.trainerId, trainerId)),
    });
    return student?.status ?? null;
  }

  async getStudentPlanUsage(trainerId: string, excludingStudentId?: string) {
    const database = getTrainerPlanDatabase();
    const trainer = await database.query.trainers.findFirst({
      columns: { plan: true },
      where: eq(schema.trainers.id, trainerId),
    });
    if (trainer === undefined) throw new Error('Treinador não encontrado');

    const conditions = [
      eq(schema.students.trainerId, trainerId),
      eq(schema.students.status, 'active'),
    ];
    if (excludingStudentId !== undefined) {
      conditions.push(ne(schema.students.id, excludingStudentId));
    }
    const result = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.students)
      .where(and(...conditions));

    return { plan: trainer.plan, activeStudentCount: result[0]?.count ?? 0 };
  }

  async deleteForTrainer(id: string, trainerId: string) {
    const result = await db
      .delete(schema.students)
      .where(and(eq(schema.students.id, id), eq(schema.students.trainerId, trainerId)))
      .returning({ id: schema.students.id });
    return result.length > 0;
  }

  async updatePushToken(studentId: string, token: string) {
    await db
      .update(schema.students)
      .set({ expoPushToken: token })
      .where(eq(schema.students.id, studentId));
  }
}
