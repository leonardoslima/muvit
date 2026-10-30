import { describe, expect, it } from 'vitest';
import { sanitizeAuthRequestUrl } from './auth-request-logging.js';

describe('URLs de autenticação nos logs', () => {
  it.each([
    [
      '/api/auth/reset-password/token-secreto?callbackURL=muvit://reset-password',
      '/api/auth/reset-password/[redacted]',
    ],
    ['/api/auth/reset-password?token=token-secreto', '/api/auth/reset-password'],
    ['/api/auth/request-password-reset?email=ana@example.com', '/api/auth/request-password-reset'],
    ['/api/auth/get-session', '/api/auth/get-session'],
    ['/students?page=2', '/students?page=2'],
  ])('remove dados sensíveis de %s', (url: string, expected: string) => {
    expect(sanitizeAuthRequestUrl(url)).toBe(expected);
  });
});
