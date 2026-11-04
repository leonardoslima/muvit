import { db, queryClient, schema } from '@muvit/db';
import type { TrainerProfile, UpdateTrainerProfileInput } from '@muvit/validators';
import { and, eq, sql } from 'drizzle-orm';
import type { TrainersRepository } from './trainers-repository.js';

function toTrainerProfile(trainer: typeof schema.trainers.$inferSelect): TrainerProfile {
  return {
    id: trainer.id,
    name: trainer.name,
    email: trainer.email,
    phone: trainer.phone,
    bio: trainer.bio,
    specialties: trainer.specialties,
    avatarUrl: trainer.avatarUrl,
    plan: trainer.plan,
    onboardedAt: trainer.onboardedAt?.toISOString() ?? null,
    createdAt: trainer.createdAt.toISOString(),
    updatedAt: trainer.updatedAt.toISOString(),
  };
}

export class DrizzleTrainersRepository implements TrainersRepository {
  async withProfileUpdateLock(
    profileId: string,
    operation: () => Promise<TrainerProfile>,
  ): Promise<TrainerProfile> {
    const connection = await queryClient.reserve();
    try {
      await connection`select pg_advisory_lock(hashtextextended(${profileId}, 0))`;
      try {
        return await operation();
      } finally {
        await connection`select pg_advisory_unlock(hashtextextended(${profileId}, 0))`;
      }
    } finally {
      connection.release();
    }
  }

  async findById(profileId: string): Promise<TrainerProfile | null> {
    const trainer = await db.query.trainers.findFirst({
      where: eq(schema.trainers.id, profileId),
    });

    return trainer === undefined ? null : toTrainerProfile(trainer);
  }

  async updateProfile(
    profileId: string,
    input: UpdateTrainerProfileInput,
    expectedUpdatedAt: string,
  ): Promise<TrainerProfile | null> {
    const previousUpdatedAt = new Date(expectedUpdatedAt);
    const updatedAt = new Date(Math.max(Date.now(), previousUpdatedAt.getTime() + 1));
    const [trainer] = await db
      .update(schema.trainers)
      .set({ ...input, updatedAt })
      .where(
        and(
          eq(schema.trainers.id, profileId),
          sql`date_trunc('milliseconds', ${schema.trainers.updatedAt}) = ${previousUpdatedAt.toISOString()}::timestamptz`,
        ),
      )
      .returning();

    return trainer === undefined ? null : toTrainerProfile(trainer);
  }

  async completeOnboarding(profileId: string, onboardedAt: Date): Promise<Date> {
    const [trainer] = await db
      .update(schema.trainers)
      .set({ onboardedAt })
      .where(eq(schema.trainers.id, profileId))
      .returning({ onboardedAt: schema.trainers.onboardedAt });

    if (trainer?.onboardedAt === undefined || trainer.onboardedAt === null) {
      throw new Error('Onboarding do treinador não pôde ser concluído');
    }

    return trainer.onboardedAt;
  }
}
