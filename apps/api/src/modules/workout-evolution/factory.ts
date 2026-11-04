import { DrizzleWorkoutEvolutionRepository } from './repositories/drizzle-workout-evolution-repository.js';
import { GetWorkoutEvolutionUseCase } from './use-cases/get-workout-evolution.js';
import { GetWorkoutGoalUseCase } from './use-cases/get-workout-goal.js';
import { UpdateWorkoutGoalUseCase } from './use-cases/update-workout-goal.js';

export function makeWorkoutEvolutionModule() {
  const repository = new DrizzleWorkoutEvolutionRepository();

  return {
    getWorkoutEvolution: new GetWorkoutEvolutionUseCase(repository),
    getWorkoutGoal: new GetWorkoutGoalUseCase(repository),
    updateWorkoutGoal: new UpdateWorkoutGoalUseCase(repository),
  };
}
