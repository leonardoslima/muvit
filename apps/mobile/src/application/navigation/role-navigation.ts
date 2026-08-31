export type MobileRole = 'student' | 'trainer';
export type RouteArea = 'auth' | 'student' | 'trainer' | 'unknown';

export const mobileRoutes = {
  login: '/(auth)/login',
  studentHome: '/(student)/(tabs)',
  trainerHome: '/(trainer)/trainer',
} as const;

export type RouteAccessInput = {
  isAuthenticated: boolean;
  role: unknown;
  area: RouteArea;
};

export type RouteAccessDecision =
  | { kind: 'allow' }
  | { kind: 'redirect'; href: string; reason: 'unauthenticated' | 'wrong-role' }
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
  if (segments.includes('(auth)')) return 'auth';
  if (segments.includes('(student)')) return 'student';
  if (segments.includes('(trainer)')) return 'trainer';
  return 'unknown';
}

export function resolveRouteAccess(input: RouteAccessInput): RouteAccessDecision {
  if (!input.isAuthenticated) {
    return input.area === 'auth'
      ? { kind: 'allow' }
      : { kind: 'redirect', href: mobileRoutes.login, reason: 'unauthenticated' };
  }

  const role = resolveMobileRole(input.role);
  if (!role) return { kind: 'unsupported-role', href: mobileRoutes.login };
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
