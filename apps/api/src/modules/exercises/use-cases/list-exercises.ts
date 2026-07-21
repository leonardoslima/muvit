import type { RequestIdentity } from '../../../shared/request-identity.js';
import type {
  ExerciseListQuery,
  ExercisesRepository,
} from '../repositories/exercises-repository.js';

export class ListExercisesUseCase {
  constructor(private readonly exercisesRepository: ExercisesRepository) {}

  async execute(identity: RequestIdentity, query: ExerciseListQuery) {
    const scope = identity.role === 'student' ? 'global' : query.scope;
    return this.exercisesRepository.list({ ...query, identity, scope });
  }
}
