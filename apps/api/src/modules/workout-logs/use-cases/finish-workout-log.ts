import type { AuthUser } from '../../../shared/auth-user.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { EnsureStudentAccessUseCase } from '../../students/use-cases/ensure-student-access.js';
import type {
  FinishWorkoutLogInput,
  WorkoutLogsRepository,
} from '../repositories/workout-logs-repository.js';

export class FinishWorkoutLogUseCase {
  constructor(
    private readonly workoutLogsRepository: WorkoutLogsRepository,
    private readonly ensureStudentAccess: EnsureStudentAccessUseCase,
  ) {}

  async execute(user: AuthUser, id: string, input: FinishWorkoutLogInput) {
    const log = await this.workoutLogsRepository.findById(id);
    if (!log) throw new UseCaseError('not_found', 'not found');
    await this.ensureStudentAccess.execute(user, log.studentId, {
      studentMismatchError: 'not_found',
    });

    const fullLog = await this.workoutLogsRepository.finish(id, input);
    if (!fullLog) throw new UseCaseError('conflict', 'log already completed');
    return fullLog;
  }
}
