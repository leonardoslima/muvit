import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { TrainersRepository } from '../repositories/trainers-repository.js';

export class CompleteTrainerOnboardingUseCase {
  constructor(private readonly trainersRepository: TrainersRepository) {}

  async execute(identity: RequestIdentity): Promise<{ onboardedAt: Date }> {
    const onboardedAt = await this.trainersRepository.completeOnboarding(
      identity.profileId,
      new Date(),
    );

    return { onboardedAt };
  }
}
