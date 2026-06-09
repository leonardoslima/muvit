import type { AuthUser } from '../../../shared/auth-user.js';
import type { EnsureStudentAccessUseCase } from '../../students/use-cases/ensure-student-access.js';
import type {
  CreateWorkoutPlanInput,
  WorkoutPlansRepository,
} from '../repositories/workout-plans-repository.js';

export class CreateWorkoutPlanUseCase {
  constructor(
    private readonly workoutPlansRepository: WorkoutPlansRepository,
    private readonly ensureStudentAccess: EnsureStudentAccessUseCase,
  ) {}

  async execute(user: AuthUser, input: CreateWorkoutPlanInput) {
    await this.ensureStudentAccess.execute(user, input.studentId, {
      studentMismatchError: 'not_found',
    });
    const trainerId = user.role === 'trainer' ? user.sub : null;
    return this.workoutPlansRepository.create({ ...input, trainerId });
  }
}
