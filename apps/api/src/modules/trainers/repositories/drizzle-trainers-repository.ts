import { db, schema } from '@muvit/db';
import { eq } from 'drizzle-orm';
import type { TrainersRepository } from './trainers-repository.js';

export class DrizzleTrainersRepository implements TrainersRepository {
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
