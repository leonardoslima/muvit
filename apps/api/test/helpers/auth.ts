import type { FastifyInstance } from 'fastify';

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  role: 'trainer' | 'student';
};

export function cookieHeaderFromSetCookie(setCookie: string | string[] | undefined): string {
  if (setCookie === undefined) return '';

  const values = Array.isArray(setCookie) ? setCookie : [setCookie];
  return values.map((value) => value.split(';', 1)[0]).join('; ');
}

export async function signUpWithSession(app: FastifyInstance, input: SignUpInput) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    payload: input,
  });

  return {
    response,
    cookie: cookieHeaderFromSetCookie(response.headers['set-cookie']),
  };
}
