import type { StudentAccessPolicy } from '../students/use-cases/student-access-policy.js';
import { DrizzleReportsRepository } from './repositories/drizzle-reports-repository.js';
import { GetStudentReportUseCase } from './use-cases/get-student-report.js';

export function makeReportsModule(ensureStudentAccess: StudentAccessPolicy) {
  const repository = new DrizzleReportsRepository();
  return { getStudentReport: new GetStudentReportUseCase(repository, ensureStudentAccess) };
}
