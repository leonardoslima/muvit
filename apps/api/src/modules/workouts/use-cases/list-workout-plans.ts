import type { AuthUser } from '../../../shared/auth-user.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type { ListWorkoutPlansRepository } from '../repositories/workout-plans-repository.js';

export class ListWorkoutPlansUseCase {
  constructor(
    private readonly workoutPlansRepository: ListWorkoutPlansRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(user: AuthUser, studentId: string) {
    await this.ensureStudentAccess.execute(user, studentId, { studentMismatchError: 'not_found' });
    return { items: await this.workoutPlansRepository.listForStudent(studentId) };
  }
}
