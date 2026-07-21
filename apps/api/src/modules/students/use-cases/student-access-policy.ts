import type { Student } from '@muvit/db/schema';
import type { RequestIdentity } from '../../../shared/request-identity.js';

export type StudentAccessOptions = {
  studentMismatchError?: 'forbidden' | 'not_found';
};

export interface StudentAccessPolicy {
  execute(
    identity: RequestIdentity,
    studentId: string,
    options?: StudentAccessOptions,
  ): Promise<Student>;
}
