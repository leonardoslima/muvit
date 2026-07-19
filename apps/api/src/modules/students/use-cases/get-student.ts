import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { StudentAccessPolicy } from './student-access-policy.js';

export class GetStudentUseCase {
  constructor(private readonly ensureStudentAccess: StudentAccessPolicy) {}

  async execute(identity: RequestIdentity, studentId: string) {
    return this.ensureStudentAccess.execute(identity, studentId);
  }
}
