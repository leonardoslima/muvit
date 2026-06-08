import type { AuthRepository } from '../repositories/auth-repository.js';

export class CompleteTrainerOnboardingUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(trainerId: string) {
    const onboardedAt = await this.authRepository.completeTrainerOnboarding(trainerId, new Date());
    return { onboardedAt };
  }
}
