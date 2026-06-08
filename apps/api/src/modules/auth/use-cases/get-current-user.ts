import type { AuthUser } from '../../../shared/auth-user.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { AuthRepository } from '../repositories/auth-repository.js';

export class GetCurrentUserUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(user: AuthUser) {
    if (user.role === 'trainer') {
      const trainer = await this.authRepository.findTrainerById(user.sub);
      if (!trainer) throw new UseCaseError('not_found', 'not found');
      return {
        id: trainer.id,
        name: trainer.name,
        email: trainer.email,
        role: 'trainer' as const,
        onboardedAt: trainer.onboardedAt,
      };
    }

    const student = await this.authRepository.findStudentById(user.sub);
    if (!student) throw new UseCaseError('not_found', 'not found');
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      role: 'student' as const,
      isIndependent: student.isIndependent,
    };
  }
}
