import { clearAuthCookies } from '@/lib/auth-cookies';
import { NextResponse } from 'next/server';

export async function POST() {
  await clearAuthCookies();
  return NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'),
  );
}
