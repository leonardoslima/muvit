import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type { ListWorkoutPlansRepository } from '../repositories/workout-plans-repository.js';

export class ListWorkoutPlansUseCase {
  constructor(
    private readonly workoutPlansRepository: ListWorkoutPlansRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(identity: RequestIdentity, studentId: string) {
    await this.ensureStudentAccess.execute(identity, studentId, {
      studentMismatchError: 'not_found',
    });
    return { items: await this.workoutPlansRepository.listForStudent(studentId) };
  }
}
