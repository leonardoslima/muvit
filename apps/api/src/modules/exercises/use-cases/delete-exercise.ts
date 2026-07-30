import { UseCaseError } from '../../../shared/use-case-error.js';
import type { ExercisesRepository } from '../repositories/exercises-repository.js';

export class DeleteExerciseUseCase {
  constructor(private readonly exercisesRepository: ExercisesRepository) {}

  async execute(id: string, trainerId: string) {
    const deleted = await this.exercisesRepository.deleteForTrainer(id, trainerId);
    if (!deleted) throw new UseCaseError('not_found', 'not found');
  }
}
