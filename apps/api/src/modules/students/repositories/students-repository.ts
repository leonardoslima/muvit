import type { Student } from '@muvit/db/schema';
import type {
  createStudentSchema,
  listStudentsQuerySchema,
  updateStudentSchema,
} from '@muvit/validators';
import type { z } from 'zod';

export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

export interface StudentsRepository {
  findById(id: string): Promise<Student | null>;
  listForTrainer(
    trainerId: string,
    query: ListStudentsQuery,
  ): Promise<{ items: Student[]; total: number }>;
  createForTrainer(trainerId: string, input: CreateStudentInput): Promise<Student>;
  updateForTrainer(
    id: string,
    trainerId: string,
    input: UpdateStudentInput,
  ): Promise<Student | null>;
  deleteForTrainer(id: string, trainerId: string): Promise<boolean>;
  updatePushToken(studentId: string, token: string): Promise<void>;
}
