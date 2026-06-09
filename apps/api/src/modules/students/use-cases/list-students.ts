import type {
  ListStudentsQuery,
  ListStudentsRepository,
} from '../repositories/students-repository.js';

export class ListStudentsUseCase {
  constructor(private readonly studentsRepository: ListStudentsRepository) {}

  async execute(trainerId: string, query: ListStudentsQuery) {
    return this.studentsRepository.listForTrainer(trainerId, query);
  }
}
