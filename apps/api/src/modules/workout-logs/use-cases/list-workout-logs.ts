import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type {
  ListWorkoutLogsQuery,
  WorkoutLogsRepository,
} from '../repositories/workout-logs-repository.js';

export class ListWorkoutLogsUseCase {
  constructor(
    private readonly workoutLogsRepository: WorkoutLogsRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(identity: RequestIdentity, studentId: string, query: ListWorkoutLogsQuery) {
    await this.ensureStudentAccess.execute(identity, studentId, {
      studentMismatchError: 'not_found',
    });
    return { items: await this.workoutLogsRepository.listForStudent(studentId, query) };
  }
}
