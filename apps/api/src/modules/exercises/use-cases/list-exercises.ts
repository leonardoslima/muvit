import type { AuthUser } from '../../../shared/auth-user.js';
import type {
  ExerciseListQuery,
  ExercisesRepository,
} from '../repositories/exercises-repository.js';

export class ListExercisesUseCase {
  constructor(private readonly exercisesRepository: ExercisesRepository) {}

  async execute(user: AuthUser, query: ExerciseListQuery) {
    const scope = user.role === 'student' ? 'global' : query.scope;
    return this.exercisesRepository.list({ ...query, user, scope });
  }
}
