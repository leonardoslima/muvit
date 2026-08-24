import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'trainer' | 'student';
  image: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readAuthUser(payload: unknown): AuthUser | null {
  if (!isRecord(payload) || !isRecord(payload.user)) return null;

  const { id, name, email, role, image } = payload.user;
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    (role !== 'trainer' && role !== 'student') ||
    (image !== undefined && image !== null && typeof image !== 'string')
  ) {
    return null;
  }

  return { id, name, email, role, image: typeof image === 'string' ? image : null };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get('cookie');
  const forwardedHeaders = new Headers();
  if (cookie) forwardedHeaders.set('cookie', cookie);

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/auth/get-session`, {
    method: 'GET',
    headers: forwardedHeaders,
    credentials: 'include',
    cache: 'no-store',
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error('Falha ao consultar a sessão atual.');
  }

  const payload: unknown = await response.json();
  return readAuthUser(payload);
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
