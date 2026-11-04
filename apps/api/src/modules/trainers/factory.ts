import type { TrainerIdentityUpdater } from '../auth/trainer-identity-updater.js';
import { DrizzleTrainersRepository } from './repositories/drizzle-trainers-repository.js';
import { CompleteTrainerOnboardingUseCase } from './use-cases/complete-trainer-onboarding.js';
import { GetTrainerProfileUseCase } from './use-cases/get-trainer-profile.js';
import { UpdateTrainerProfileUseCase } from './use-cases/update-trainer-profile.js';

export function makeTrainersModule(identityUpdater: TrainerIdentityUpdater) {
  const repository = new DrizzleTrainersRepository();

  return {
    completeOnboarding: new CompleteTrainerOnboardingUseCase(repository),
    getProfile: new GetTrainerProfileUseCase(repository),
    updateProfile: new UpdateTrainerProfileUseCase(repository, identityUpdater),
  };
}
