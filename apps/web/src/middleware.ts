import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/signup'];
const AUTH_PATHS = ['/login', '/signup'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const access = req.cookies.get('muvit_access')?.value;

  if (access && AUTH_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/api');
  if (!access && !isPublic) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
