export type MobileRole = 'student' | 'trainer';
export type RouteArea = 'auth' | 'recovery' | 'verification' | 'student' | 'trainer' | 'unknown';

export const mobileRoutes = {
  login: '/(auth)/login',
  verifyEmail: '/(auth)/verify-email',
  studentHome: '/(student)/(tabs)',
  trainerHome: '/(trainer)/trainer',
} as const;

export type RouteAccessInput = {
  isAuthenticated: boolean;
  emailVerified?: boolean;
  role: unknown;
  area: RouteArea;
};

export type RouteAccessDecision =
  | { kind: 'allow' }
  | {
      kind: 'redirect';
      href: string;
      reason: 'unauthenticated' | 'wrong-role' | 'email-unverified';
    }
  | { kind: 'unsupported-role'; href: typeof mobileRoutes.login };

export function resolveMobileRole(value: unknown): MobileRole | null {
  if (value === 'student' || value === 'trainer') return value;
  return null;
}

export function resolveInitialRoute(role: unknown): string | null {
  const resolvedRole = resolveMobileRole(role);
  if (resolvedRole === 'student') return mobileRoutes.studentHome;
  if (resolvedRole === 'trainer') return mobileRoutes.trainerHome;
  return null;
}

export function resolveRouteArea(segments: readonly string[]): RouteArea {
  if (segments.includes('(auth)') && segments.includes('verify-email')) return 'verification';
  if (
    segments.includes('(auth)') &&
    (segments.includes('forgot-password') || segments.includes('reset-password'))
  )
    return 'recovery';
  if (segments.includes('(auth)')) return 'auth';
  if (segments.includes('(student)')) return 'student';
  if (segments.includes('(trainer)')) return 'trainer';
  return 'unknown';
}

export function resolveRouteAccess(input: RouteAccessInput): RouteAccessDecision {
  if (input.area === 'recovery' || input.area === 'verification') return { kind: 'allow' };
  if (!input.isAuthenticated) {
    return input.area === 'auth'
      ? { kind: 'allow' }
      : { kind: 'redirect', href: mobileRoutes.login, reason: 'unauthenticated' };
  }

  const role = resolveMobileRole(input.role);
  if (!role) return { kind: 'unsupported-role', href: mobileRoutes.login };
  if (input.emailVerified !== true) {
    return { kind: 'redirect', href: mobileRoutes.verifyEmail, reason: 'email-unverified' };
  }
  if (input.area === 'auth') {
    return {
      kind: 'redirect',
      href: role === 'student' ? mobileRoutes.studentHome : mobileRoutes.trainerHome,
      reason: 'wrong-role',
    };
  }

  const expectedArea = role === 'student' ? 'student' : 'trainer';
  if (input.area === expectedArea) return { kind: 'allow' };

  return {
    kind: 'redirect',
    href: role === 'student' ? mobileRoutes.studentHome : mobileRoutes.trainerHome,
    reason: 'wrong-role',
  };
}
