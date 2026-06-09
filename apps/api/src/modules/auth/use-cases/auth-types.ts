import type { loginSchema, signupStudentSchema, signupTrainerSchema } from '@muvit/validators';
import type { z } from 'zod';

export type SignupTrainerInput = z.infer<typeof signupTrainerSchema>;
export type SignupStudentInput = z.infer<typeof signupStudentSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TokenPayload = { sub: string; role: 'trainer' | 'student' };
export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: 'trainer' | 'student' };
};

export type AuthTokenServices = {
  signAccessToken: (payload: TokenPayload) => Promise<string> | string;
  signRefreshToken: (payload: TokenPayload) => Promise<string> | string;
};

export type PasswordServices = {
  hashPassword: (password: string) => Promise<string>;
  verifyPassword: (password: string, hash: string) => Promise<boolean>;
};
