import type { AuthUser } from '../../../shared/auth-user.js';
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

  async execute(user: AuthUser, studentId: string, query: ListAssessmentsQuery) {
    await this.ensureStudentAccess.execute(user, studentId, { studentMismatchError: 'not_found' });
    return this.assessmentsRepository.listForStudent(studentId, query);
  }
}
