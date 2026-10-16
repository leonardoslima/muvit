import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type { ListWorkoutPlanDraftsRepository } from '../repositories/workout-plan-drafts-repository.js';
import { assertWorkoutPlanDraftTrainer } from './assert-workout-plan-draft-trainer.js';

export class ListWorkoutPlanDraftsUseCase {
  constructor(
    private readonly draftsRepository: ListWorkoutPlanDraftsRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(identity: RequestIdentity, studentId: string) {
    assertWorkoutPlanDraftTrainer(identity);
    await this.ensureStudentAccess.execute(identity, studentId, {
      studentMismatchError: 'not_found',
    });
    return this.draftsRepository.listForStudent(identity.profileId, studentId);
  }
}
