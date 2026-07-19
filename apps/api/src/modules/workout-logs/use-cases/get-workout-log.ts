import type { RequestIdentity } from '../../../shared/request-identity.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type { WorkoutLogsRepository } from '../repositories/workout-logs-repository.js';

export class GetWorkoutLogUseCase {
  constructor(
    private readonly workoutLogsRepository: WorkoutLogsRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(identity: RequestIdentity, id: string) {
    const log = await this.workoutLogsRepository.findById(id);
    if (!log) throw new UseCaseError('not_found', 'not found');
    await this.ensureStudentAccess.execute(identity, log.studentId, {
      studentMismatchError: 'not_found',
    });

    const fullLog = await this.workoutLogsRepository.findFullById(id);
    if (!fullLog) throw new UseCaseError('not_found', 'not found');
    return fullLog;
  }
}
