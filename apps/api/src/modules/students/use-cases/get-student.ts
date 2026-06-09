import type { AuthUser } from '../../../shared/auth-user.js';
import type { EnsureStudentAccessUseCase } from './ensure-student-access.js';

export class GetStudentUseCase {
  constructor(private readonly ensureStudentAccess: EnsureStudentAccessUseCase) {}

  async execute(user: AuthUser, studentId: string) {
    return this.ensureStudentAccess.execute(user, studentId);
  }
}
