import { db, schema } from '@muvit/db';
import type { NewAssessment } from '@muvit/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import type {
  AssessmentsRepository,
  CreateAssessmentInput,
  ListAssessmentsQuery,
  UpdateAssessmentInput,
} from './assessments-repository.js';

function serializeAssessmentInput(input: CreateAssessmentInput | UpdateAssessmentInput) {
  const { weightKg, heightCm, bodyFatPct, ...rest } = input;
  const values: Partial<NewAssessment> = { ...rest };
  if (weightKg !== undefined) values.weightKg = String(weightKg);
  if (heightCm !== undefined) values.heightCm = String(heightCm);
  if (bodyFatPct !== undefined) values.bodyFatPct = String(bodyFatPct);
  return values;
}

export class DrizzleAssessmentsRepository implements AssessmentsRepository {
  async listForStudent(studentId: string, query: ListAssessmentsQuery) {
    const { limit, offset } = query;
    const where = eq(schema.assessments.studentId, studentId);

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

    return { items, total: countResult[0]?.count ?? 0 };
  }

  async create(studentId: string, input: CreateAssessmentInput) {
    const values = serializeAssessmentInput(input);
    const [assessment] = await db
      .insert(schema.assessments)
      .values({ ...values, date: input.date, studentId })
      .returning();
    if (!assessment) throw new Error('insert failed');
    return assessment;
  }

  async findById(id: string) {
    return (await db.query.assessments.findFirst({ where: eq(schema.assessments.id, id) })) ?? null;
  }

  async update(id: string, input: UpdateAssessmentInput) {
    const [assessment] = await db
      .update(schema.assessments)
      .set(serializeAssessmentInput(input))
      .where(and(eq(schema.assessments.id, id)))
      .returning();
    if (!assessment) throw new Error('update failed');
    return assessment;
  }

  async delete(id: string) {
    await db.delete(schema.assessments).where(eq(schema.assessments.id, id));
  }
}
