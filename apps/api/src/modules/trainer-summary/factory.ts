import { DrizzleTrainerSummaryRepository } from './repositories/drizzle-trainer-summary-repository.js';
import { GetTrainerSummaryUseCase } from './use-cases/get-trainer-summary.js';

export function makeTrainerSummaryModule() {
  const repository = new DrizzleTrainerSummaryRepository();

  return {
    getTrainerSummary: new GetTrainerSummaryUseCase(repository),
  };
}
