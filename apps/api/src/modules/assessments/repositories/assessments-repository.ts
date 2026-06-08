import type { Assessment } from '@muvit/db/schema';
import type {
  createAssessmentSchema,
  listAssessmentsQuerySchema,
  updateAssessmentSchema,
} from '@muvit/validators';
import type { z } from 'zod';

export type ListAssessmentsQuery = z.infer<typeof listAssessmentsQuerySchema>;
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;

export interface AssessmentsRepository {
  listForStudent(
    studentId: string,
    query: ListAssessmentsQuery,
  ): Promise<{ items: Assessment[]; total: number }>;
  create(studentId: string, input: CreateAssessmentInput): Promise<Assessment>;
  findById(id: string): Promise<Assessment | null>;
  update(id: string, input: UpdateAssessmentInput): Promise<Assessment>;
  delete(id: string): Promise<void>;
}
