export interface TrainerPlanMutationLock {
  withTrainerPlanMutationLock<T>(trainerId: string, operation: () => Promise<T>): Promise<T>;
}
