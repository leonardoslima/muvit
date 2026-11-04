import { makeNotificationsModule } from '../notifications/factory.js';
import { DrizzleTrainerPlanMutationLock } from '../trainer-plan/repositories/drizzle-trainer-plan-mutation-lock.js';
import { DrizzleStudentsRepository } from './repositories/drizzle-students-repository.js';
import { AssertStudentPlanLimitUseCase } from './use-cases/assert-student-plan-limit.js';
import { CreateStudentUseCase } from './use-cases/create-student.js';
import { DeleteStudentUseCase } from './use-cases/delete-student.js';
import { EnsureStudentAccessUseCase } from './use-cases/ensure-student-access.js';
import { GetStudentUseCase } from './use-cases/get-student.js';
import { ListStudentsUseCase } from './use-cases/list-students.js';
import { RegisterStudentPushTokenUseCase } from './use-cases/register-student-push-token.js';
import { UpdateStudentUseCase } from './use-cases/update-student.js';

type StudentsLogger = Parameters<typeof makeNotificationsModule>[0];

export function makeStudentsModule(logger?: StudentsLogger) {
  const repository = new DrizzleStudentsRepository();
  const ensureStudentAccess = new EnsureStudentAccessUseCase(repository);
  const studentPlanLimit = new AssertStudentPlanLimitUseCase(repository);
  const trainerPlanMutationLock = new DrizzleTrainerPlanMutationLock();
  const notifications = makeNotificationsModule(logger);

  return {
    ensureStudentAccess,
    listStudents: new ListStudentsUseCase(repository),
    createStudent: new CreateStudentUseCase(
      repository,
      studentPlanLimit,
      trainerPlanMutationLock,
      notifications.notifyNewStudent,
      notifications.logger,
    ),
    getStudent: new GetStudentUseCase(ensureStudentAccess),
    updateStudent: new UpdateStudentUseCase(repository, studentPlanLimit, trainerPlanMutationLock),
    deleteStudent: new DeleteStudentUseCase(repository),
    registerStudentPushToken: new RegisterStudentPushTokenUseCase(repository),
  };
}
