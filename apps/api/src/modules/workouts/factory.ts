import type { StudentAccessPolicy } from '../students/use-cases/student-access-policy.js';
import { DrizzleWorkoutPlansRepository } from './repositories/drizzle-workout-plans-repository.js';
import { CreateWorkoutPlanUseCase } from './use-cases/create-workout-plan.js';
import { DeleteWorkoutPlanUseCase } from './use-cases/delete-workout-plan.js';
import { GetWorkoutPlanUseCase } from './use-cases/get-workout-plan.js';
import { ListWorkoutPlansUseCase } from './use-cases/list-workout-plans.js';
import { UpdateWorkoutPlanUseCase } from './use-cases/update-workout-plan.js';

export function makeWorkoutsModule(ensureStudentAccess: StudentAccessPolicy) {
  const repository = new DrizzleWorkoutPlansRepository();

  return {
    createWorkoutPlan: new CreateWorkoutPlanUseCase(repository, ensureStudentAccess),
    listWorkoutPlans: new ListWorkoutPlansUseCase(repository, ensureStudentAccess),
    getWorkoutPlan: new GetWorkoutPlanUseCase(repository, ensureStudentAccess),
    updateWorkoutPlan: new UpdateWorkoutPlanUseCase(repository, ensureStudentAccess),
    deleteWorkoutPlan: new DeleteWorkoutPlanUseCase(repository, ensureStudentAccess),
  };
}
