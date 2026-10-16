import type { RequestIdentity } from '../../../shared/request-identity.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type { SaveWorkoutPlanDraftRepository } from '../repositories/workout-plan-drafts-repository.js';
import type { FindWorkoutPlanAccessRepository } from '../repositories/workout-plans-repository.js';
import { assertWorkoutPlanAccess } from './assert-workout-plan-access.js';
import { assertWorkoutPlanDraftTrainer } from './assert-workout-plan-draft-trainer.js';

export class SaveWorkoutPlanDraftUseCase {
  constructor(
    private readonly draftsRepository: SaveWorkoutPlanDraftRepository,
    private readonly plansRepository: FindWorkoutPlanAccessRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(
    identity: RequestIdentity,
    input: Parameters<SaveWorkoutPlanDraftRepository['save']>[1],
  ) {
    assertWorkoutPlanDraftTrainer(identity);
    await this.ensureStudentAccess.execute(identity, input.studentId, {
      studentMismatchError: 'not_found',
    });

    if (input.sourcePlanId) {
      const sourcePlan = await this.plansRepository.findAccessById(input.sourcePlanId);
      if (
        !sourcePlan ||
        sourcePlan.studentId !== input.studentId ||
        sourcePlan.status === 'archived'
      ) {
        throw new UseCaseError('not_found', 'not found');
      }
      await assertWorkoutPlanAccess(identity, sourcePlan, this.ensureStudentAccess);
    }

    const draft = await this.draftsRepository.save(identity.profileId, input);
    if (!draft) throw new UseCaseError('conflict', 'conflict');
    return draft;
  }
}
