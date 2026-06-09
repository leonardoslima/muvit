import type { UpdateStudentPushTokenRepository } from '../repositories/students-repository.js';

export class RegisterStudentPushTokenUseCase {
  constructor(private readonly studentsRepository: UpdateStudentPushTokenRepository) {}

  async execute(studentId: string, token: string) {
    await this.studentsRepository.updatePushToken(studentId, token);
  }
}
