import type { Student } from '@muvit/db/schema';
import type { TrainerPlanMutationLock } from '../../trainer-plan/trainer-plan-mutation-lock.js';
import type {
  CreateStudentInput,
  CreateStudentRepository,
} from '../repositories/students-repository.js';
import type { StudentPlanLimitPolicy } from './assert-student-plan-limit.js';

export interface NewStudentNotifier {
  execute(
    trainerId: string,
    student: Pick<Student, 'id' | 'name' | 'expoPushToken'>,
  ): Promise<void>;
}

export interface NewStudentNotificationLogger {
  warn(fields: {
    category: 'new_student_notification_failed';
    trainerId: string;
    studentId: string;
  }): void;
}

export class CreateStudentUseCase {
  constructor(
    private readonly studentsRepository: CreateStudentRepository,
    private readonly studentPlanLimit: StudentPlanLimitPolicy,
    private readonly trainerPlanMutationLock: TrainerPlanMutationLock,
    private readonly newStudentNotifier: NewStudentNotifier,
    private readonly notificationLogger: NewStudentNotificationLogger,
  ) {}

  async execute(trainerId: string, input: CreateStudentInput) {
    const student =
      (input.status ?? 'active') !== 'active'
        ? await this.studentsRepository.createForTrainer(trainerId, input)
        : await this.trainerPlanMutationLock.withTrainerPlanMutationLock(trainerId, async () => {
            await this.studentPlanLimit.assertCanActivate(trainerId);
            return this.studentsRepository.createForTrainer(trainerId, input);
          });

    try {
      await this.newStudentNotifier.execute(trainerId, student);
    } catch {
      this.notificationLogger.warn({
        category: 'new_student_notification_failed',
        trainerId,
        studentId: student.id,
      });
    }
    return student;
  }
}
