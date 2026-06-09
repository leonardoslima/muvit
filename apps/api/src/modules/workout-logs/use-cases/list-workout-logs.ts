import type { AuthUser } from '../../../shared/auth-user.js';
import type { EnsureStudentAccessUseCase } from '../../students/use-cases/ensure-student-access.js';
import type {
  ListWorkoutLogsQuery,
  WorkoutLogsRepository,
} from '../repositories/workout-logs-repository.js';

export class ListWorkoutLogsUseCase {
  constructor(
    private readonly workoutLogsRepository: WorkoutLogsRepository,
    private readonly ensureStudentAccess: EnsureStudentAccessUseCase,
  ) {}

  async execute(user: AuthUser, studentId: string, query: ListWorkoutLogsQuery) {
    await this.ensureStudentAccess.execute(user, studentId, { studentMismatchError: 'not_found' });
    return { items: await this.workoutLogsRepository.listForStudent(studentId, query) };
  }
}
