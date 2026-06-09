import type { ListStudentsQuery, StudentsRepository } from '../repositories/students-repository.js';

export class ListStudentsUseCase {
  constructor(private readonly studentsRepository: StudentsRepository) {}

  async execute(trainerId: string, query: ListStudentsQuery) {
    return this.studentsRepository.listForTrainer(trainerId, query);
  }
}
