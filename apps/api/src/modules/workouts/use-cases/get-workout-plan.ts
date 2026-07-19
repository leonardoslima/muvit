import type { RequestIdentity } from '../../../shared/request-identity.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type {
  FindWorkoutPlanAccessRepository,
  FindWorkoutPlanFullRepository,
} from '../repositories/workout-plans-repository.js';
import { assertWorkoutPlanAccess } from './assert-workout-plan-access.js';

export class GetWorkoutPlanUseCase {
  constructor(
    private readonly workoutPlansRepository: FindWorkoutPlanAccessRepository &
      FindWorkoutPlanFullRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(identity: RequestIdentity, id: string) {
    const access = await this.workoutPlansRepository.findAccessById(id);
    if (!access) throw new UseCaseError('not_found', 'not found');
    await assertWorkoutPlanAccess(identity, access, this.ensureStudentAccess);

    const plan = await this.workoutPlansRepository.findFullById(id);
    if (!plan) throw new UseCaseError('not_found', 'not found');
    return plan;
  }
}
