import type { AuthUser } from '../../../shared/auth-user.js';
import type { EnsureStudentAccessUseCase } from '../../students/use-cases/ensure-student-access.js';
import type { WorkoutPlansRepository } from '../repositories/workout-plans-repository.js';

export class ListWorkoutPlansUseCase {
  constructor(
    private readonly workoutPlansRepository: WorkoutPlansRepository,
    private readonly ensureStudentAccess: EnsureStudentAccessUseCase,
  ) {}

  async execute(user: AuthUser, studentId: string) {
    await this.ensureStudentAccess.execute(user, studentId, { studentMismatchError: 'not_found' });
    return { items: await this.workoutPlansRepository.listForStudent(studentId) };
  }
}
