import { DrizzleStudentsRepository } from './repositories/drizzle-students-repository.js';
import { AssertStudentPlanLimitUseCase } from './use-cases/assert-student-plan-limit.js';
import { CreateStudentUseCase } from './use-cases/create-student.js';
import { DeleteStudentUseCase } from './use-cases/delete-student.js';
import { EnsureStudentAccessUseCase } from './use-cases/ensure-student-access.js';
import { GetStudentUseCase } from './use-cases/get-student.js';
import { ListStudentsUseCase } from './use-cases/list-students.js';
import { RegisterStudentPushTokenUseCase } from './use-cases/register-student-push-token.js';
import { UpdateStudentUseCase } from './use-cases/update-student.js';

export function makeStudentsModule() {
  const repository = new DrizzleStudentsRepository();
  const ensureStudentAccess = new EnsureStudentAccessUseCase(repository);
  const studentPlanLimit = new AssertStudentPlanLimitUseCase(repository);

  return {
    ensureStudentAccess,
    listStudents: new ListStudentsUseCase(repository),
    createStudent: new CreateStudentUseCase(repository, studentPlanLimit),
    getStudent: new GetStudentUseCase(ensureStudentAccess),
    updateStudent: new UpdateStudentUseCase(repository, studentPlanLimit),
    deleteStudent: new DeleteStudentUseCase(repository),
    registerStudentPushToken: new RegisterStudentPushTokenUseCase(repository),
  };
}
