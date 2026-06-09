import type { Student } from '@muvit/db/schema';
import type { AuthUser } from '../../../shared/auth-user.js';

export type StudentAccessOptions = {
  studentMismatchError?: 'forbidden' | 'not_found';
};

export interface StudentAccessPolicy {
  execute(user: AuthUser, studentId: string, options?: StudentAccessOptions): Promise<Student>;
}
