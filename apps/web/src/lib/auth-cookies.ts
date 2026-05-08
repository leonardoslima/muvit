import { cookies } from 'next/headers';

const ACCESS = 'muvit_access';
const REFRESH = 'muvit_refresh';

export async function setAuthCookies(access: string, refresh: string) {
  const c = await cookies();
  c.set(ACCESS, access, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 15,
  });
  c.set(REFRESH, refresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAuthCookies() {
  const c = await cookies();
  c.delete(ACCESS);
  c.delete(REFRESH);
}

export async function getAccess() {
  return (await cookies()).get(ACCESS)?.value;
}
