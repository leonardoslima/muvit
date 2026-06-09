import type { AuthUser } from '../../../shared/auth-user.js';
import type { StudentAccessPolicy } from './student-access-policy.js';

export class GetStudentUseCase {
  constructor(private readonly ensureStudentAccess: StudentAccessPolicy) {}

  async execute(user: AuthUser, studentId: string) {
    return this.ensureStudentAccess.execute(user, studentId);
  }
}
