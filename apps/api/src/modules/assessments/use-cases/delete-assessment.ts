import type { AuthUser } from '../../../shared/auth-user.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { EnsureStudentAccessUseCase } from '../../students/use-cases/ensure-student-access.js';
import type { AssessmentsRepository } from '../repositories/assessments-repository.js';

export class DeleteAssessmentUseCase {
  constructor(
    private readonly assessmentsRepository: AssessmentsRepository,
    private readonly ensureStudentAccess: EnsureStudentAccessUseCase,
  ) {}

  async execute(user: AuthUser, id: string) {
    const existing = await this.assessmentsRepository.findById(id);
    if (!existing) throw new UseCaseError('not_found', 'not found');
    await this.ensureStudentAccess.execute(user, existing.studentId, {
      studentMismatchError: 'not_found',
    });
    await this.assessmentsRepository.delete(id);
  }
}
