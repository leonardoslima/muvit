import type { FastifyInstance } from 'fastify';
import { hashPassword, verifyPassword } from '../../lib/passwords.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/tokens.js';
import { DrizzleAuthRepository } from './repositories/drizzle-auth-repository.js';
import { CompleteTrainerOnboardingUseCase } from './use-cases/complete-trainer-onboarding.js';
import { GetCurrentUserUseCase } from './use-cases/get-current-user.js';
import { LoginUseCase } from './use-cases/login.js';
import { RefreshTokenUseCase } from './use-cases/refresh-token.js';
import { SignupStudentUseCase } from './use-cases/signup-student.js';
import { SignupTrainerUseCase } from './use-cases/signup-trainer.js';

export function makeAuthModule(app: FastifyInstance) {
  const repository = new DrizzleAuthRepository();
  const tokenServices = {
    signAccessToken: async (payload: { sub: string; role: 'trainer' | 'student' }) =>
      signAccessToken(app, payload),
    signRefreshToken: async (payload: { sub: string; role: 'trainer' | 'student' }) =>
      signRefreshToken(app, payload),
  };

  return {
    signupTrainer: new SignupTrainerUseCase(repository, { hashPassword, ...tokenServices }),
    signupStudent: new SignupStudentUseCase(repository, { hashPassword, ...tokenServices }),
    login: new LoginUseCase(repository, { verifyPassword, ...tokenServices }),
    refreshToken: new RefreshTokenUseCase(
      (token) => verifyRefreshToken(app, token),
      tokenServices.signAccessToken,
    ),
    getCurrentUser: new GetCurrentUserUseCase(repository),
    completeTrainerOnboarding: new CompleteTrainerOnboardingUseCase(repository),
  };
}
