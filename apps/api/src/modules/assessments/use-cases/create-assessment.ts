import type { AuthUser } from '../../../shared/auth-user.js';
import type { EnsureStudentAccessUseCase } from '../../students/use-cases/ensure-student-access.js';
import type {
  AssessmentsRepository,
  CreateAssessmentInput,
} from '../repositories/assessments-repository.js';

export class CreateAssessmentUseCase {
  constructor(
    private readonly assessmentsRepository: AssessmentsRepository,
    private readonly ensureStudentAccess: EnsureStudentAccessUseCase,
  ) {}

  async execute(user: AuthUser, studentId: string, input: CreateAssessmentInput) {
    await this.ensureStudentAccess.execute(user, studentId, { studentMismatchError: 'not_found' });
    return this.assessmentsRepository.create(studentId, input);
  }
}
