import type { RequestIdentity } from '../../../shared/request-identity.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type { FindWorkoutPlanDraftRepository } from '../repositories/workout-plan-drafts-repository.js';
import { assertWorkoutPlanDraftTrainer } from './assert-workout-plan-draft-trainer.js';

export class GetWorkoutPlanDraftUseCase {
  constructor(
    private readonly draftsRepository: FindWorkoutPlanDraftRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(identity: RequestIdentity, id: string) {
    assertWorkoutPlanDraftTrainer(identity);
    const draft = await this.draftsRepository.findById(identity.profileId, id);
    if (!draft) throw new UseCaseError('not_found', 'not found');
    await this.ensureStudentAccess.execute(identity, draft.studentId, {
      studentMismatchError: 'not_found',
    });
    return draft;
  }
}
