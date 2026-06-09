import type { AuthUser } from '../../../shared/auth-user.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type {
  AssessmentsRepository,
  UpdateAssessmentInput,
} from '../repositories/assessments-repository.js';

export class UpdateAssessmentUseCase {
  constructor(
    private readonly assessmentsRepository: AssessmentsRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(user: AuthUser, id: string, input: UpdateAssessmentInput) {
    const existing = await this.assessmentsRepository.findById(id);
    if (!existing) throw new UseCaseError('not_found', 'not found');
    await this.ensureStudentAccess.execute(user, existing.studentId, {
      studentMismatchError: 'not_found',
    });
    return this.assessmentsRepository.update(id, input);
  }
}
