import type { Student } from '@muvit/db/schema';
import type { AuthUser } from '../../../shared/auth-user.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { FindStudentByIdRepository } from '../repositories/students-repository.js';
import type { StudentAccessOptions, StudentAccessPolicy } from './student-access-policy.js';

export class EnsureStudentAccessUseCase implements StudentAccessPolicy {
  constructor(private readonly studentsRepository: FindStudentByIdRepository) {}

  async execute(
    user: AuthUser,
    studentId: string,
    options: StudentAccessOptions = {},
  ): Promise<Student> {
    const student = await this.studentsRepository.findById(studentId);
    if (!student) throw new UseCaseError('not_found', 'not found');

    if (user.role === 'trainer' && student.trainerId !== user.sub) {
      throw new UseCaseError('not_found', 'not found');
    }

    if (user.role === 'student' && student.id !== user.sub) {
      const code = options.studentMismatchError ?? 'forbidden';
      throw new UseCaseError(code, code === 'forbidden' ? 'forbidden' : 'not found');
    }

    return student;
  }
}
