import type {
  CreateStudentInput,
  CreateStudentRepository,
} from '../repositories/students-repository.js';
import type { StudentPlanLimitPolicy } from './assert-student-plan-limit.js';

export class CreateStudentUseCase {
  constructor(
    private readonly studentsRepository: CreateStudentRepository,
    private readonly studentPlanLimit: StudentPlanLimitPolicy,
  ) {}

  async execute(trainerId: string, input: CreateStudentInput) {
    if ((input.status ?? 'active') === 'active') {
      await this.studentPlanLimit.assertCanActivate(trainerId);
    }
    return this.studentsRepository.createForTrainer(trainerId, input);
  }
}
