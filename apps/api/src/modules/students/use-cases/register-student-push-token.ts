import type { StudentsRepository } from '../repositories/students-repository.js';

export class RegisterStudentPushTokenUseCase {
  constructor(private readonly studentsRepository: StudentsRepository) {}

  async execute(studentId: string, token: string) {
    await this.studentsRepository.updatePushToken(studentId, token);
  }
}
