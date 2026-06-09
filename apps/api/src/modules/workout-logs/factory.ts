import type { StudentAccessPolicy } from '../students/use-cases/student-access-policy.js';
import { DrizzleWorkoutLogsRepository } from './repositories/drizzle-workout-logs-repository.js';
import { FinishWorkoutLogUseCase } from './use-cases/finish-workout-log.js';
import { GetWorkoutLogUseCase } from './use-cases/get-workout-log.js';
import { ListWorkoutLogsUseCase } from './use-cases/list-workout-logs.js';
import { StartWorkoutLogUseCase } from './use-cases/start-workout-log.js';

export function makeWorkoutLogsModule(ensureStudentAccess: StudentAccessPolicy) {
  const repository = new DrizzleWorkoutLogsRepository();

  return {
    startWorkoutLog: new StartWorkoutLogUseCase(repository, ensureStudentAccess),
    finishWorkoutLog: new FinishWorkoutLogUseCase(repository, ensureStudentAccess),
    getWorkoutLog: new GetWorkoutLogUseCase(repository, ensureStudentAccess),
    listWorkoutLogs: new ListWorkoutLogsUseCase(repository, ensureStudentAccess),
  };
}
