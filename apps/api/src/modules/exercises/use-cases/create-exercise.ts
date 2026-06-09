import type {
  CreateExerciseInput,
  ExercisesRepository,
} from '../repositories/exercises-repository.js';

export class CreateExerciseUseCase {
  constructor(private readonly exercisesRepository: ExercisesRepository) {}

  async execute(trainerId: string, input: CreateExerciseInput) {
    return this.exercisesRepository.create(trainerId, input);
  }
}
