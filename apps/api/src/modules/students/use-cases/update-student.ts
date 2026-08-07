import { UseCaseError } from '../../../shared/use-case-error.js';
import type {
  FindStudentStatusForTrainerRepository,
  UpdateStudentInput,
  UpdateStudentRepository,
} from '../repositories/students-repository.js';
import type { StudentPlanLimitPolicy } from './assert-student-plan-limit.js';

type UpdateStudentDependencies = UpdateStudentRepository & FindStudentStatusForTrainerRepository;

export class UpdateStudentUseCase {
  constructor(
    private readonly studentsRepository: UpdateStudentDependencies,
    private readonly studentPlanLimit: StudentPlanLimitPolicy,
  ) {}

  async execute(id: string, trainerId: string, input: UpdateStudentInput) {
    const currentStatus = await this.studentsRepository.findStatusForTrainer(id, trainerId);
    if (currentStatus === null) throw new UseCaseError('not_found', 'not found');

    if (input.status === 'active' && currentStatus !== 'active') {
      await this.studentPlanLimit.assertCanActivate(trainerId, id);
    }

    const student = await this.studentsRepository.updateForTrainer(id, trainerId, input);
    if (!student) throw new UseCaseError('not_found', 'not found');
    return student;
  }
}
