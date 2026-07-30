import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type {
  AssessmentsRepository,
  ListAssessmentsQuery,
} from '../repositories/assessments-repository.js';

export class ListAssessmentsUseCase {
  constructor(
    private readonly assessmentsRepository: AssessmentsRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
  ) {}

  async execute(identity: RequestIdentity, studentId: string, query: ListAssessmentsQuery) {
    await this.ensureStudentAccess.execute(identity, studentId, {
      studentMismatchError: 'not_found',
    });
    return this.assessmentsRepository.listForStudent(studentId, query);
  }
}
