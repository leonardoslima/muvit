import type { EnsureStudentAccessUseCase } from '../students/use-cases/ensure-student-access.js';
import { DrizzleAssessmentsRepository } from './repositories/drizzle-assessments-repository.js';
import { CreateAssessmentUseCase } from './use-cases/create-assessment.js';
import { DeleteAssessmentUseCase } from './use-cases/delete-assessment.js';
import { GetAssessmentUseCase } from './use-cases/get-assessment.js';
import { ListAssessmentsUseCase } from './use-cases/list-assessments.js';
import { UpdateAssessmentUseCase } from './use-cases/update-assessment.js';

export function makeAssessmentsModule(ensureStudentAccess: EnsureStudentAccessUseCase) {
  const repository = new DrizzleAssessmentsRepository();

  return {
    listAssessments: new ListAssessmentsUseCase(repository, ensureStudentAccess),
    createAssessment: new CreateAssessmentUseCase(repository, ensureStudentAccess),
    getAssessment: new GetAssessmentUseCase(repository, ensureStudentAccess),
    updateAssessment: new UpdateAssessmentUseCase(repository, ensureStudentAccess),
    deleteAssessment: new DeleteAssessmentUseCase(repository, ensureStudentAccess),
  };
}
