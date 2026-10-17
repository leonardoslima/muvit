import type { WorkoutGoalReader } from '../repositories/workout-evolution-repository.js';

export class GetWorkoutGoalUseCase {
  constructor(private readonly repository: WorkoutGoalReader) {}

  execute(studentId: string) {
    return this.repository.getGoal(studentId);
  }
}
