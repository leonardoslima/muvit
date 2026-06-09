import type { TrainerSummaryRepository } from '../repositories/trainer-summary-repository.js';

export class GetTrainerSummaryUseCase {
  constructor(private readonly trainerSummaryRepository: TrainerSummaryRepository) {}

  async execute(trainerId: string, now = new Date()) {
    return this.trainerSummaryRepository.getSummary(trainerId, now);
  }
}
