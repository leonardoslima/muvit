import { DrizzleTrainersRepository } from './repositories/drizzle-trainers-repository.js';
import { CompleteTrainerOnboardingUseCase } from './use-cases/complete-trainer-onboarding.js';

export function makeTrainersModule() {
  const repository = new DrizzleTrainersRepository();

  return {
    completeOnboarding: new CompleteTrainerOnboardingUseCase(repository),
  };
}
