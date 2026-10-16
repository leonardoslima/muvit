import type { RequestIdentity } from '../../../shared/request-identity.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type {
  FindWorkoutPlanDraftRepository,
  PublishWorkoutPlanDraftRepository,
} from '../repositories/workout-plan-drafts-repository.js';
import { assertWorkoutPlanDraftTrainer } from './assert-workout-plan-draft-trainer.js';

export class PublishWorkoutPlanDraftUseCase {
  constructor(
    private readonly draftsRepository: FindWorkoutPlanDraftRepository &
      PublishWorkoutPlanDraftRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(
    identity: RequestIdentity,
    id: string,
    input: Parameters<PublishWorkoutPlanDraftRepository['publish']>[2],
  ) {
    assertWorkoutPlanDraftTrainer(identity);
    const draft = await this.draftsRepository.findById(identity.profileId, id);
    if (!draft) throw new UseCaseError('not_found', 'not found');
    await this.ensureStudentAccess.execute(identity, draft.studentId, {
      studentMismatchError: 'not_found',
    });

    const plan = await this.draftsRepository.publish(identity.profileId, id, input);
    if (!plan) throw new UseCaseError('not_found', 'not found');
    return plan;
  }
}
