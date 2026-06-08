import type { AuthUser } from '../../../shared/auth-user.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { EnsureStudentAccessUseCase } from '../../students/use-cases/ensure-student-access.js';
import type { WorkoutPlansRepository } from '../repositories/workout-plans-repository.js';
import { assertWorkoutPlanAccess } from './assert-workout-plan-access.js';

export class GetWorkoutPlanUseCase {
  constructor(
    private readonly workoutPlansRepository: WorkoutPlansRepository,
    private readonly ensureStudentAccess: EnsureStudentAccessUseCase,
  ) {}

  async execute(user: AuthUser, id: string) {
    const access = await this.workoutPlansRepository.findAccessById(id);
    if (!access) throw new UseCaseError('not_found', 'not found');
    await assertWorkoutPlanAccess(user, access, this.ensureStudentAccess);

    const plan = await this.workoutPlansRepository.findFullById(id);
    if (!plan) throw new UseCaseError('not_found', 'not found');
    return plan;
  }
}
