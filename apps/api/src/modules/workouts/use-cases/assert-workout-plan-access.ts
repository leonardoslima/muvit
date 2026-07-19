import type { RequestIdentity } from '../../../shared/request-identity.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type { WorkoutPlanAccess } from '../repositories/workout-plans-repository.js';

export async function assertWorkoutPlanAccess(
  identity: RequestIdentity,
  plan: WorkoutPlanAccess,
  ensureStudentAccess: StudentAccessPolicy,
) {
  await ensureStudentAccess.execute(identity, plan.studentId, {
    studentMismatchError: 'not_found',
  });

  if (identity.role === 'trainer' && plan.trainerId !== identity.profileId) {
    throw new UseCaseError('not_found', 'not found');
  }
  if (
    identity.role === 'student' &&
    plan.trainerId !== null &&
    plan.studentId !== identity.profileId
  ) {
    throw new UseCaseError('not_found', 'not found');
  }
}
