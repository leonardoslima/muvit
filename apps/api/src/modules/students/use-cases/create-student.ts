import type {
  CreateStudentInput,
  StudentsRepository,
} from '../repositories/students-repository.js';

export class CreateStudentUseCase {
  constructor(private readonly studentsRepository: StudentsRepository) {}

  async execute(trainerId: string, input: CreateStudentInput) {
    return this.studentsRepository.createForTrainer(trainerId, input);
  }
}
