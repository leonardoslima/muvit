import { UseCaseError } from '../../../shared/use-case-error.js';
import type { DeleteExerciseRepository } from '../repositories/exercises-repository.js';

export class DeleteExerciseUseCase {
  constructor(private readonly exercisesRepository: DeleteExerciseRepository) {}

  async execute(id: string, trainerId: string) {
    const result = await this.exercisesRepository.deleteForTrainer(id, trainerId);
    if (result === 'not_found') throw new UseCaseError('not_found', 'not found');
    if (result === 'draft_reference') {
      throw new UseCaseError('conflict', 'exercise is referenced by an unpublished workout draft');
    }
  }
}
