import type { StudentAccessPolicy } from '../students/use-cases/student-access-policy.js';
import { DrizzleWorkoutPlanDraftsRepository } from './repositories/drizzle-workout-plan-drafts-repository.js';
import { DrizzleWorkoutPlansRepository } from './repositories/drizzle-workout-plans-repository.js';
import { CreateWorkoutPlanUseCase } from './use-cases/create-workout-plan.js';
import { DeleteWorkoutPlanUseCase } from './use-cases/delete-workout-plan.js';
import { GetWorkoutPlanDraftUseCase } from './use-cases/get-workout-plan-draft.js';
import { GetWorkoutPlanUseCase } from './use-cases/get-workout-plan.js';
import { ListWorkoutPlanDraftsUseCase } from './use-cases/list-workout-plan-drafts.js';
import { ListWorkoutPlansUseCase } from './use-cases/list-workout-plans.js';
import { PublishWorkoutPlanDraftUseCase } from './use-cases/publish-workout-plan-draft.js';
import { SaveWorkoutPlanDraftUseCase } from './use-cases/save-workout-plan-draft.js';
import { UpdateWorkoutPlanUseCase } from './use-cases/update-workout-plan.js';

export function makeWorkoutsModule(ensureStudentAccess: StudentAccessPolicy) {
  const repository = new DrizzleWorkoutPlansRepository();
  const draftsRepository = new DrizzleWorkoutPlanDraftsRepository();

  return {
    createWorkoutPlan: new CreateWorkoutPlanUseCase(repository, ensureStudentAccess),
    listWorkoutPlans: new ListWorkoutPlansUseCase(repository, ensureStudentAccess),
    getWorkoutPlan: new GetWorkoutPlanUseCase(repository, ensureStudentAccess),
    updateWorkoutPlan: new UpdateWorkoutPlanUseCase(repository, ensureStudentAccess),
    deleteWorkoutPlan: new DeleteWorkoutPlanUseCase(repository, ensureStudentAccess),
    saveWorkoutPlanDraft: new SaveWorkoutPlanDraftUseCase(
      draftsRepository,
      repository,
      ensureStudentAccess,
    ),
    listWorkoutPlanDrafts: new ListWorkoutPlanDraftsUseCase(draftsRepository, ensureStudentAccess),
    getWorkoutPlanDraft: new GetWorkoutPlanDraftUseCase(draftsRepository, ensureStudentAccess),
    publishWorkoutPlanDraft: new PublishWorkoutPlanDraftUseCase(
      draftsRepository,
      ensureStudentAccess,
    ),
  };
}
