import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { StudentAccessPolicy } from './student-access-policy.js';

export class GetStudentUseCase {
  constructor(private readonly ensureStudentAccess: StudentAccessPolicy) {}

  async execute(identity: RequestIdentity, studentId: string) {
    const student = await this.ensureStudentAccess.execute(identity, studentId);
    if (identity.role === 'trainer') return student;

    const { internalNotes: _internalNotes, ...studentWithoutInternalNotes } = student;
    return studentWithoutInternalNotes;
  }
}
