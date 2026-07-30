import { UseCaseError } from '../../../shared/use-case-error.js';
import type { DeleteStudentRepository } from '../repositories/students-repository.js';

export class DeleteStudentUseCase {
  constructor(private readonly studentsRepository: DeleteStudentRepository) {}

  async execute(id: string, trainerId: string) {
    const deleted = await this.studentsRepository.deleteForTrainer(id, trainerId);
    if (!deleted) throw new UseCaseError('not_found', 'not found');
  }
}
