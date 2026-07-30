import type { RequestIdentity } from '../../../shared/request-identity.js';
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

  async execute(identity: RequestIdentity, input: CreateWorkoutPlanInput) {
    await this.ensureStudentAccess.execute(identity, input.studentId, {
      studentMismatchError: 'not_found',
    });
    const trainerId = identity.role === 'trainer' ? identity.profileId : null;
    return this.workoutPlansRepository.create({ ...input, trainerId });
  }
}
