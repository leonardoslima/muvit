import type { RequestIdentity } from '../../../shared/request-identity.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type {
  FindWorkoutPlanAccessRepository,
  UpdateWorkoutPlanInput,
  UpdateWorkoutPlanRepository,
} from '../repositories/workout-plans-repository.js';
import { assertWorkoutPlanAccess } from './assert-workout-plan-access.js';

export class UpdateWorkoutPlanUseCase {
  constructor(
    private readonly workoutPlansRepository: FindWorkoutPlanAccessRepository &
      UpdateWorkoutPlanRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(identity: RequestIdentity, id: string, input: UpdateWorkoutPlanInput) {
    const access = await this.workoutPlansRepository.findAccessById(id);
    if (!access) throw new UseCaseError('not_found', 'not found');
    await assertWorkoutPlanAccess(identity, access, this.ensureStudentAccess);

    const updated = await this.workoutPlansRepository.update(id, input);
    if (!updated) throw new UseCaseError('not_found', 'not found');
    return updated;
  }
}
