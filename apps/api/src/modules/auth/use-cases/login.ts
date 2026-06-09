import { UseCaseError } from '../../../shared/use-case-error.js';
import type { AuthRepository } from '../repositories/auth-repository.js';
import type {
  AuthResponse,
  AuthTokenServices,
  LoginInput,
  PasswordServices,
} from './auth-types.js';

type LoginServices = Pick<PasswordServices, 'verifyPassword'> & AuthTokenServices;

export class LoginUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly services: LoginServices,
  ) {}

  async execute(input: LoginInput): Promise<AuthResponse> {
    if (input.role === 'trainer') {
      const trainer = await this.authRepository.findTrainerByEmail(input.email);
      if (!trainer || !(await this.services.verifyPassword(input.password, trainer.passwordHash))) {
        throw new UseCaseError('invalid_credentials', 'invalid credentials');
      }
      const payload = { sub: trainer.id, role: 'trainer' as const };
      return {
        accessToken: await this.services.signAccessToken(payload),
        refreshToken: await this.services.signRefreshToken(payload),
        user: { id: trainer.id, name: trainer.name, email: trainer.email, role: 'trainer' },
      };
    }

    const student = await this.authRepository.findStudentByEmail(input.email);
    if (
      !student ||
      !student.passwordHash ||
      !(await this.services.verifyPassword(input.password, student.passwordHash))
    ) {
      throw new UseCaseError('invalid_credentials', 'invalid credentials');
    }
    const payload = { sub: student.id, role: 'student' as const };
    return {
      accessToken: await this.services.signAccessToken(payload),
      refreshToken: await this.services.signRefreshToken(payload),
      user: {
        id: student.id,
        name: student.name,
        email: student.email ?? input.email,
        role: 'student',
      },
    };
  }
}
