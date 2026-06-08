import { UseCaseError } from '../../../shared/use-case-error.js';
import type {
  StudentsRepository,
  UpdateStudentInput,
} from '../repositories/students-repository.js';

export class UpdateStudentUseCase {
  constructor(private readonly studentsRepository: StudentsRepository) {}

  async execute(id: string, trainerId: string, input: UpdateStudentInput) {
    const student = await this.studentsRepository.updateForTrainer(id, trainerId, input);
    if (!student) throw new UseCaseError('not_found', 'not found');
    return student;
  }
}
