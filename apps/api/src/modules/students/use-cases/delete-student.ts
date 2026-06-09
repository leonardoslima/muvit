import { UseCaseError } from '../../../shared/use-case-error.js';
import type { StudentsRepository } from '../repositories/students-repository.js';

export class DeleteStudentUseCase {
  constructor(private readonly studentsRepository: StudentsRepository) {}

  async execute(id: string, trainerId: string) {
    const deleted = await this.studentsRepository.deleteForTrainer(id, trainerId);
    if (!deleted) throw new UseCaseError('not_found', 'not found');
  }
}
