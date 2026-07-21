export interface TrainersRepository {
  completeOnboarding(profileId: string, onboardedAt: Date): Promise<Date>;
}
