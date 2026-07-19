import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type {
  AssessmentsRepository,
  CreateAssessmentInput,
} from '../repositories/assessments-repository.js';

export class CreateAssessmentUseCase {
  constructor(
    private readonly assessmentsRepository: AssessmentsRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(identity: RequestIdentity, studentId: string, input: CreateAssessmentInput) {
    await this.ensureStudentAccess.execute(identity, studentId, {
      studentMismatchError: 'not_found',
    });
    return this.assessmentsRepository.create(studentId, input);
  }
}
