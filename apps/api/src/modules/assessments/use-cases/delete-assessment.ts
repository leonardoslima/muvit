import type { RequestIdentity } from '../../../shared/request-identity.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type { AssessmentsRepository } from '../repositories/assessments-repository.js';

export class DeleteAssessmentUseCase {
  constructor(
    private readonly assessmentsRepository: AssessmentsRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(identity: RequestIdentity, id: string) {
    const existing = await this.assessmentsRepository.findById(id);
    if (!existing) throw new UseCaseError('not_found', 'not found');
    await this.ensureStudentAccess.execute(identity, existing.studentId, {
      studentMismatchError: 'not_found',
    });
    await this.assessmentsRepository.delete(id);
  }
}
