import { UseCaseError } from '../../../shared/use-case-error.js';
import type { TokenPayload } from './auth-types.js';

export class RefreshTokenUseCase {
  constructor(
    private readonly verifyRefreshToken: (token: string) => Promise<TokenPayload>,
    private readonly signAccessToken: (payload: TokenPayload) => Promise<string>,
  ) {}

  async execute(refreshToken: string) {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);
      return { accessToken: await this.signAccessToken(decoded) };
    } catch {
      throw new UseCaseError('invalid_refresh_token', 'invalid refresh token');
    }
  }
}
