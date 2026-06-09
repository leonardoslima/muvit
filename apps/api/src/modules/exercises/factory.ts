import { DrizzleExercisesRepository } from './repositories/drizzle-exercises-repository.js';
import { CreateExerciseUseCase } from './use-cases/create-exercise.js';
import { DeleteExerciseUseCase } from './use-cases/delete-exercise.js';
import { ListExercisesUseCase } from './use-cases/list-exercises.js';
import { UpdateExerciseUseCase } from './use-cases/update-exercise.js';

export function makeExercisesModule() {
  const repository = new DrizzleExercisesRepository();

  return {
    listExercises: new ListExercisesUseCase(repository),
    createExercise: new CreateExerciseUseCase(repository),
    updateExercise: new UpdateExerciseUseCase(repository),
    deleteExercise: new DeleteExerciseUseCase(repository),
  };
}
