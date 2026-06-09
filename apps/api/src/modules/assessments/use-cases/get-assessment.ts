import type { AuthUser } from '../../../shared/auth-user.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type { AssessmentsRepository } from '../repositories/assessments-repository.js';

export class GetAssessmentUseCase {
  constructor(
    private readonly assessmentsRepository: AssessmentsRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(user: AuthUser, id: string) {
    const assessment = await this.assessmentsRepository.findById(id);
    if (!assessment) throw new UseCaseError('not_found', 'not found');
    await this.ensureStudentAccess.execute(user, assessment.studentId, {
      studentMismatchError: 'not_found',
    });
    return assessment;
  }
}
