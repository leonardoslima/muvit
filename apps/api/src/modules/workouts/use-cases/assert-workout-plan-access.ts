import type { AuthUser } from '../../../shared/auth-user.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { EnsureStudentAccessUseCase } from '../../students/use-cases/ensure-student-access.js';
import type { WorkoutPlanAccess } from '../repositories/workout-plans-repository.js';

export async function assertWorkoutPlanAccess(
  user: AuthUser,
  plan: WorkoutPlanAccess,
  ensureStudentAccess: EnsureStudentAccessUseCase,
) {
  await ensureStudentAccess.execute(user, plan.studentId, { studentMismatchError: 'not_found' });

  if (user.role === 'trainer' && plan.trainerId !== user.sub) {
    throw new UseCaseError('not_found', 'not found');
  }
  if (user.role === 'student' && plan.trainerId !== null && plan.studentId !== user.sub) {
    throw new UseCaseError('not_found', 'not found');
  }
}
