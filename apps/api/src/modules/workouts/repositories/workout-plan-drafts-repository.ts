import type {
  PublishWorkoutPlanDraftInput,
  SaveWorkoutPlanDraftInput,
  WorkoutPlanDraft,
} from '@muvit/validators';
import type { WorkoutPlanFullResponse } from './workout-plans-repository.js';

export interface SaveWorkoutPlanDraftRepository {
  save(trainerId: string, input: SaveWorkoutPlanDraftInput): Promise<WorkoutPlanDraft | null>;
}

export interface ListWorkoutPlanDraftsRepository {
  listForStudent(trainerId: string, studentId: string): Promise<WorkoutPlanDraft[]>;
}

export interface FindWorkoutPlanDraftRepository {
  findById(trainerId: string, id: string): Promise<WorkoutPlanDraft | null>;
}

export interface PublishWorkoutPlanDraftRepository {
  publish(
    trainerId: string,
    id: string,
    input: PublishWorkoutPlanDraftInput,
  ): Promise<WorkoutPlanFullResponse | null>;
}

export type WorkoutPlanDraftRepositories = SaveWorkoutPlanDraftRepository &
  ListWorkoutPlanDraftsRepository &
  FindWorkoutPlanDraftRepository &
  PublishWorkoutPlanDraftRepository;
