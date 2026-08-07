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

export interface FindStudentByIdRepository {
  findById(id: string): Promise<Student | null>;
}

export interface ListStudentsRepository {
  listForTrainer(
    trainerId: string,
    query: ListStudentsQuery,
  ): Promise<{ items: Student[]; total: number }>;
}

export interface CreateStudentRepository {
  createForTrainer(trainerId: string, input: CreateStudentInput): Promise<Student>;
}

export interface UpdateStudentRepository {
  updateForTrainer(
    id: string,
    trainerId: string,
    input: UpdateStudentInput,
  ): Promise<Student | null>;
}

export interface FindStudentStatusForTrainerRepository {
  findStatusForTrainer(id: string, trainerId: string): Promise<Student['status'] | null>;
}

export interface DeleteStudentRepository {
  deleteForTrainer(id: string, trainerId: string): Promise<boolean>;
}

export interface UpdateStudentPushTokenRepository {
  updatePushToken(studentId: string, token: string): Promise<void>;
}

export interface StudentsRepository
  extends FindStudentByIdRepository,
    ListStudentsRepository,
    CreateStudentRepository,
    UpdateStudentRepository,
    FindStudentStatusForTrainerRepository,
    DeleteStudentRepository,
    UpdateStudentPushTokenRepository {}
