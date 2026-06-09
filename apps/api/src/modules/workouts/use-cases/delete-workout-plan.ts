import type { AuthUser } from '../../../shared/auth-user.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type {
  DeleteWorkoutPlanRepository,
  FindWorkoutPlanAccessRepository,
} from '../repositories/workout-plans-repository.js';
import { assertWorkoutPlanAccess } from './assert-workout-plan-access.js';

export class DeleteWorkoutPlanUseCase {
  constructor(
    private readonly workoutPlansRepository: DeleteWorkoutPlanRepository &
      FindWorkoutPlanAccessRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(user: AuthUser, id: string) {
    const access = await this.workoutPlansRepository.findAccessById(id);
    if (!access) throw new UseCaseError('not_found', 'not found');
    await assertWorkoutPlanAccess(user, access, this.ensureStudentAccess);
    await this.workoutPlansRepository.delete(id);
  }
}
