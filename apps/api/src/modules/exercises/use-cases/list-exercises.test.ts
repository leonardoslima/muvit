import type { Exercise } from '@muvit/db/schema';
import { describe, expect, it } from 'vitest';
import type { RequestIdentity } from '../../../shared/request-identity.js';
import type {
  ExerciseListParams,
  ExercisesRepository,
} from '../repositories/exercises-repository.js';
import { ListExercisesUseCase } from './list-exercises.js';

class FakeExercisesRepository implements ExercisesRepository {
  listParams: ExerciseListParams | null = null;
  private readonly exercise: Exercise = {
    id: 'exercise-id',
    trainerId: null,
    name: 'Supino',
    muscleGroup: 'chest',
    equipment: null,
    videoUrl: null,
    instructions: null,
    createdAt: new Date(),
  };

  async list(params: ExerciseListParams) {
    this.listParams = params;
    return { items: [], total: 0, facets: { equipment: [] } };
  }

  async create() {
    return this.exercise;
  }

  async updateForTrainer() {
    return this.exercise;
  }

  async deleteForTrainer() {
    return true;
  }
}

describe('ListExercisesUseCase', () => {
  it('coerces student exercise scope to global', async () => {
    const repository = new FakeExercisesRepository();
    const useCase = new ListExercisesUseCase(repository);
    const identity: RequestIdentity = {
      authUserId: 'student-auth-id',
      profileId: 'student-id',
      role: 'student',
    };

    await useCase.execute(identity, { scope: 'mine', limit: 50, offset: 0 });

    expect(repository.listParams).toMatchObject({
      identity,
      scope: 'global',
      limit: 50,
      offset: 0,
    });
  });
});
