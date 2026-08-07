import type { Exercise } from '@muvit/db/schema';
import type {
  createExerciseSchema,
  listExercisesQuerySchema,
  listExercisesResponseSchema,
  updateExerciseSchema,
} from '@muvit/validators';
import type { z } from 'zod';
import type { RequestIdentity } from '../../../shared/request-identity.js';

export type ExerciseListQuery = z.infer<typeof listExercisesQuerySchema>;
export type ExerciseListParams = ExerciseListQuery & { identity: RequestIdentity };
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type ExerciseListResult = z.input<typeof listExercisesResponseSchema>;

export interface ExercisesRepository {
  list(params: ExerciseListParams): Promise<ExerciseListResult>;
  create(trainerId: string, input: CreateExerciseInput): Promise<Exercise>;
  updateForTrainer(
    id: string,
    trainerId: string,
    input: UpdateExerciseInput,
  ): Promise<Exercise | null>;
  deleteForTrainer(id: string, trainerId: string): Promise<boolean>;
}
