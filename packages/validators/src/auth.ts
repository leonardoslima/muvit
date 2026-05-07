import { z } from 'zod';

export const emailSchema = z.string().email().max(255);
export const passwordSchema = z.string().min(8).max(72);

export const signupTrainerSchema = z.object({
  name: z.string().min(2).max(150),
  email: emailSchema,
  password: passwordSchema,
});

export const signupStudentSchema = z.object({
  name: z.string().min(2).max(150),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  role: z.enum(['trainer', 'student']),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['trainer', 'student']),
  }),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
