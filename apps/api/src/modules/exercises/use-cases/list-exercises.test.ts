import type { Exercise } from '@muvit/db/schema';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../../../shared/auth-user.js';
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
    return { items: [], total: 0 };
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
    const user: AuthUser = { sub: 'student-id', role: 'student' };

    await useCase.execute(user, { scope: 'mine', limit: 50, offset: 0 });

    expect(repository.listParams).toMatchObject({
      user,
      scope: 'global',
      limit: 50,
      offset: 0,
    });
  });
});
