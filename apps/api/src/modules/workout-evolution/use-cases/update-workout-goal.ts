import type { UpdateWorkoutGoal } from '@muvit/validators';
import type { WorkoutGoalWriter } from '../repositories/workout-evolution-repository.js';

export class UpdateWorkoutGoalUseCase {
  constructor(private readonly repository: WorkoutGoalWriter) {}

  execute(studentId: string, input: UpdateWorkoutGoal) {
    return this.repository.saveGoal(studentId, input);
  }
}
