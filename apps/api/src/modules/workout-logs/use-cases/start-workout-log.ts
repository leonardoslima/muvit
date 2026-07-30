import type { RequestIdentity } from '../../../shared/request-identity.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type {
  StartWorkoutLogInput,
  WorkoutLogsRepository,
} from '../repositories/workout-logs-repository.js';

export class StartWorkoutLogUseCase {
  constructor(
    private readonly workoutLogsRepository: WorkoutLogsRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(identity: RequestIdentity, input: StartWorkoutLogInput) {
    const day = await this.workoutLogsRepository.findWorkoutDayAccess(input.workoutDayId);
    if (!day) throw new UseCaseError('not_found', 'not found');
    await this.ensureStudentAccess.execute(identity, day.studentId, {
      studentMismatchError: 'not_found',
    });
    return this.workoutLogsRepository.start(day.studentId, input);
  }
}
