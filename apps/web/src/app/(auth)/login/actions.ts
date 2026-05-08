'use server';

import { redirect } from 'next/navigation';
import { postAuthLogin } from '@/lib/api/sdk.gen';
import { client } from '@/lib/api/client.gen';
import { setAuthCookies } from '@/lib/auth-cookies';

export type LoginState = { error?: string } | null;

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const role = (formData.get('role') as 'trainer' | 'student') ?? 'trainer';

  if (!email || !password) return { error: 'Informe e-mail e senha.' };

  client.setConfig({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333' });
  const res = await postAuthLogin({ body: { email, password, role } });

  if (res.error || !res.data) {
    return { error: 'Credenciais inválidas. Tente novamente.' };
  }
  await setAuthCookies(res.data.accessToken, res.data.refreshToken);
  redirect('/dashboard');
}
