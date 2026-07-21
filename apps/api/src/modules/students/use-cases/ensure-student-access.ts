import type { Student } from '@muvit/db/schema';
import type { RequestIdentity } from '../../../shared/request-identity.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { FindStudentByIdRepository } from '../repositories/students-repository.js';
import type { StudentAccessOptions, StudentAccessPolicy } from './student-access-policy.js';

export class EnsureStudentAccessUseCase implements StudentAccessPolicy {
  constructor(private readonly studentsRepository: FindStudentByIdRepository) {}

  async execute(
    identity: RequestIdentity,
    studentId: string,
    options: StudentAccessOptions = {},
  ): Promise<Student> {
    const student = await this.studentsRepository.findById(studentId);
    if (!student) throw new UseCaseError('not_found', 'not found');

    if (identity.role === 'trainer' && student.trainerId !== identity.profileId) {
      throw new UseCaseError('not_found', 'not found');
    }

    if (identity.role === 'student' && student.id !== identity.profileId) {
      const code = options.studentMismatchError ?? 'forbidden';
      throw new UseCaseError(code, code === 'forbidden' ? 'forbidden' : 'not found');
    }

    return student;
  }
}
