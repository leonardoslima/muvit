import { UseCaseError } from '../../../shared/use-case-error.js';
import type {
  ExercisesRepository,
  UpdateExerciseInput,
} from '../repositories/exercises-repository.js';

export class UpdateExerciseUseCase {
  constructor(private readonly exercisesRepository: ExercisesRepository) {}

  async execute(id: string, trainerId: string, input: UpdateExerciseInput) {
    const exercise = await this.exercisesRepository.updateForTrainer(id, trainerId, input);
    if (!exercise) throw new UseCaseError('not_found', 'not found');
    return exercise;
  }
}
