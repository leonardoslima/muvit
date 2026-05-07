import { describe, expect, it } from 'vitest';
import { loginSchema, signupTrainerSchema } from './auth.js';

describe('auth schemas', () => {
  it('rejects passwords shorter than 8', () => {
    expect(() =>
      signupTrainerSchema.parse({
        name: 'Léo',
        email: 'a@b.com',
        password: 'short',
      }),
    ).toThrow();
  });
  it('accepts well-formed signup payload', () => {
    expect(
      signupTrainerSchema.parse({
        name: 'Léo',
        email: 'a@b.com',
        password: '12345678',
      }),
    ).toMatchObject({ email: 'a@b.com' });
  });
  it('login requires role', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: 'x' })).toThrow();
  });
});
