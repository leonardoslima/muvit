import { redirect } from 'next/navigation';
import { configureServerClient } from './api-client';
import { getAuthMe } from './api/sdk.gen';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'trainer' | 'student';
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const client = await configureServerClient();
  const res = await getAuthMe({ client });
  if (res.error || !res.data) return null;
  return res.data as AuthUser;
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
