import type { TrainerProfile, UpdateTrainerProfileInput } from '@muvit/validators';

export interface FindTrainerProfileRepository {
  findById(profileId: string): Promise<TrainerProfile | null>;
}

export interface UpdateTrainerProfileRepository extends FindTrainerProfileRepository {
  withProfileUpdateLock(
    profileId: string,
    operation: () => Promise<TrainerProfile>,
  ): Promise<TrainerProfile>;
  updateProfile(
    profileId: string,
    input: UpdateTrainerProfileInput,
    expectedUpdatedAt: string,
  ): Promise<TrainerProfile | null>;
}

export interface TrainersRepository extends UpdateTrainerProfileRepository {
  completeOnboarding(profileId: string, onboardedAt: Date): Promise<Date>;
}
