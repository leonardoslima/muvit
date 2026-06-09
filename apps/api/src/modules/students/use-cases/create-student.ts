import type {
  CreateStudentInput,
  CreateStudentRepository,
} from '../repositories/students-repository.js';

export class CreateStudentUseCase {
  constructor(private readonly studentsRepository: CreateStudentRepository) {}

  async execute(trainerId: string, input: CreateStudentInput) {
    return this.studentsRepository.createForTrainer(trainerId, input);
  }
}
