import { db, schema } from '@muvit/db';
import { eq } from 'drizzle-orm';
import type { AuthRepository } from './auth-repository.js';

export class DrizzleAuthRepository implements AuthRepository {
  async findTrainerByEmail(email: string) {
    return (await db.query.trainers.findFirst({ where: eq(schema.trainers.email, email) })) ?? null;
  }

  async createTrainer(input: Parameters<AuthRepository['createTrainer']>[0]) {
    const [trainer] = await db.insert(schema.trainers).values(input).returning();
    if (!trainer) throw new Error('insert failed');
    return trainer;
  }

  async findStudentByEmail(email: string) {
    return (await db.query.students.findFirst({ where: eq(schema.students.email, email) })) ?? null;
  }

  async createIndependentStudent(input: Parameters<AuthRepository['createIndependentStudent']>[0]) {
    const [student] = await db.insert(schema.students).values(input).returning();
    if (!student) throw new Error('insert failed');
    return student;
  }

  async findTrainerById(id: string) {
    return (await db.query.trainers.findFirst({ where: eq(schema.trainers.id, id) })) ?? null;
  }

  async findStudentById(id: string) {
    return (await db.query.students.findFirst({ where: eq(schema.students.id, id) })) ?? null;
  }

  async completeTrainerOnboarding(id: string, onboardedAt: Date) {
    const [trainer] = await db
      .update(schema.trainers)
      .set({ onboardedAt })
      .where(eq(schema.trainers.id, id))
      .returning({ onboardedAt: schema.trainers.onboardedAt });
    if (!trainer?.onboardedAt) throw new Error('onboarding update failed');
    return trainer.onboardedAt;
  }
}
