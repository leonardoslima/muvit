import { UseCaseError } from '../../../shared/use-case-error.js';
import type { AuthRepository } from '../repositories/auth-repository.js';
import type {
  AuthResponse,
  AuthTokenServices,
  PasswordServices,
  SignupStudentInput,
} from './auth-types.js';

type SignupStudentServices = Pick<PasswordServices, 'hashPassword'> & AuthTokenServices;

export class SignupStudentUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly services: SignupStudentServices,
  ) {}

  async execute(input: SignupStudentInput): Promise<AuthResponse> {
    const existing = await this.authRepository.findStudentByEmail(input.email);
    if (existing) throw new UseCaseError('duplicate_email', 'email already registered');

    const student = await this.authRepository.createIndependentStudent({
      name: input.name,
      email: input.email,
      passwordHash: await this.services.hashPassword(input.password),
      isIndependent: true,
    });
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
