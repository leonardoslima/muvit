import type { TrainerPlanMutationLock } from '../../trainer-plan/trainer-plan-mutation-lock.js';
import type {
  CreateStudentInput,
  CreateStudentRepository,
} from '../repositories/students-repository.js';
import type { StudentPlanLimitPolicy } from './assert-student-plan-limit.js';

export class CreateStudentUseCase {
  constructor(
    private readonly studentsRepository: CreateStudentRepository,
    private readonly studentPlanLimit: StudentPlanLimitPolicy,
    private readonly trainerPlanMutationLock: TrainerPlanMutationLock,
  ) {}

  async execute(trainerId: string, input: CreateStudentInput) {
    if ((input.status ?? 'active') !== 'active') {
      return this.studentsRepository.createForTrainer(trainerId, input);
    }

    return this.trainerPlanMutationLock.withTrainerPlanMutationLock(trainerId, async () => {
      await this.studentPlanLimit.assertCanActivate(trainerId);
      return this.studentsRepository.createForTrainer(trainerId, input);
    });
  }
}
