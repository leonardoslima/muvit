import type { AuthUser } from '../../../shared/auth-user.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type {
  CreateWorkoutPlanInput,
  CreateWorkoutPlanRepository,
} from '../repositories/workout-plans-repository.js';

export class CreateWorkoutPlanUseCase {
  constructor(
    private readonly workoutPlansRepository: CreateWorkoutPlanRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(user: AuthUser, input: CreateWorkoutPlanInput) {
    await this.ensureStudentAccess.execute(user, input.studentId, {
      studentMismatchError: 'not_found',
    });
    const trainerId = user.role === 'trainer' ? user.sub : null;
    return this.workoutPlansRepository.create({ ...input, trainerId });
  }
}
