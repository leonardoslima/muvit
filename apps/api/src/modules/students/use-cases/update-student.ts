import { UseCaseError } from '../../../shared/use-case-error.js';
import type {
  UpdateStudentInput,
  UpdateStudentRepository,
} from '../repositories/students-repository.js';

export class UpdateStudentUseCase {
  constructor(private readonly studentsRepository: UpdateStudentRepository) {}

  async execute(id: string, trainerId: string, input: UpdateStudentInput) {
    const student = await this.studentsRepository.updateForTrainer(id, trainerId, input);
    if (!student) throw new UseCaseError('not_found', 'not found');
    return student;
  }
}
