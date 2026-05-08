'use server';

import { redirect } from 'next/navigation';
import { postAuthSignupStudent, postAuthSignupTrainer } from '@/lib/api/sdk.gen';
import { client } from '@/lib/api/client.gen';
import { setAuthCookies } from '@/lib/auth-cookies';

export type SignupState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function signupAction(_: SignupState, formData: FormData): Promise<SignupState> {
  const role = (formData.get('role') as 'trainer' | 'student') ?? 'trainer';
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = 'Informe seu nome.';
  if (!email) fieldErrors.email = 'Informe um e-mail.';
  if (password.length < 8) fieldErrors.password = 'Senha precisa de pelo menos 8 caracteres.';
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  client.setConfig({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333' });
  const fn = role === 'trainer' ? postAuthSignupTrainer : postAuthSignupStudent;
  const res = await fn({ body: { name, email, password } });

  if (res.error || !res.data) {
    return { error: 'Não foi possível criar a conta. E-mail já cadastrado?' };
  }
  await setAuthCookies(res.data.accessToken, res.data.refreshToken);
  redirect(role === 'trainer' ? '/dashboard' : '/me');
}
