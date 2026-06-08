import type {
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
  workoutPlanFullSchema,
} from '@muvit/validators';
import type { z } from 'zod';

export type CreateWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
export type UpdateWorkoutPlanInput = z.infer<typeof updateWorkoutPlanSchema>;
export type WorkoutPlanFullResponse = z.input<typeof workoutPlanFullSchema>;
export type CreateWorkoutPlanData = CreateWorkoutPlanInput & { trainerId: string | null };
export type WorkoutPlanAccess = { id: string; studentId: string; trainerId: string | null };
export type WorkoutPlanSummary = {
  id: string;
  studentId: string;
  trainerId: string | null;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: 'draft' | 'active' | 'archived';
  createdAt: Date;
};

export interface WorkoutPlansRepository {
  create(data: CreateWorkoutPlanData): Promise<WorkoutPlanFullResponse>;
  listForStudent(studentId: string): Promise<WorkoutPlanSummary[]>;
  findFullById(id: string): Promise<WorkoutPlanFullResponse | null>;
  findAccessById(id: string): Promise<WorkoutPlanAccess | null>;
  update(id: string, input: UpdateWorkoutPlanInput): Promise<WorkoutPlanFullResponse | null>;
  delete(id: string): Promise<void>;
}
