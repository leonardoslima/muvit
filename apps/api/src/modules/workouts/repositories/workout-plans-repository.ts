import type {
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
  workoutPlanFullSchema,
  workoutPlanSummarySchema,
} from '@muvit/validators';
import type { z } from 'zod';

export type CreateWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
export type UpdateWorkoutPlanInput = z.infer<typeof updateWorkoutPlanSchema>;
export type WorkoutPlanFullResponse = z.input<typeof workoutPlanFullSchema>;
export type CreateWorkoutPlanData = CreateWorkoutPlanInput & { trainerId: string | null };
export type WorkoutPlanAccess = { id: string; studentId: string; trainerId: string | null };
export type WorkoutPlanSummary = z.input<typeof workoutPlanSummarySchema>;

export interface CreateWorkoutPlanRepository {
  create(data: CreateWorkoutPlanData): Promise<WorkoutPlanFullResponse>;
}

export interface ListWorkoutPlansRepository {
  listForStudent(studentId: string): Promise<WorkoutPlanSummary[]>;
}

export interface FindWorkoutPlanFullRepository {
  findFullById(id: string): Promise<WorkoutPlanFullResponse | null>;
}

export interface FindWorkoutPlanAccessRepository {
  findAccessById(id: string): Promise<WorkoutPlanAccess | null>;
}

export interface UpdateWorkoutPlanRepository {
  update(id: string, input: UpdateWorkoutPlanInput): Promise<WorkoutPlanFullResponse | null>;
}

export interface DeleteWorkoutPlanRepository {
  delete(id: string): Promise<void>;
}

export interface WorkoutPlansRepository
  extends CreateWorkoutPlanRepository,
    ListWorkoutPlansRepository,
    FindWorkoutPlanFullRepository,
    FindWorkoutPlanAccessRepository,
    UpdateWorkoutPlanRepository,
    DeleteWorkoutPlanRepository {}
