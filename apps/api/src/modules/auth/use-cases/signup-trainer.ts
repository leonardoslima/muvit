import { UseCaseError } from '../../../shared/use-case-error.js';
import type { AuthRepository } from '../repositories/auth-repository.js';
import type {
  AuthResponse,
  AuthTokenServices,
  PasswordServices,
  SignupTrainerInput,
} from './auth-types.js';

type SignupTrainerServices = Pick<PasswordServices, 'hashPassword'> & AuthTokenServices;

export class SignupTrainerUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly services: SignupTrainerServices,
  ) {}

  async execute(input: SignupTrainerInput): Promise<AuthResponse> {
    const existing = await this.authRepository.findTrainerByEmail(input.email);
    if (existing) throw new UseCaseError('duplicate_email', 'email already registered');

    const trainer = await this.authRepository.createTrainer({
      name: input.name,
      email: input.email,
      passwordHash: await this.services.hashPassword(input.password),
    });
    const payload = { sub: trainer.id, role: 'trainer' as const };

    return {
      accessToken: await this.services.signAccessToken(payload),
      refreshToken: await this.services.signRefreshToken(payload),
      user: { id: trainer.id, name: trainer.name, email: trainer.email, role: 'trainer' },
    };
  }
}
