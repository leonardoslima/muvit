import { describe, expect, it } from 'vitest';
import {
  mobileRoutes,
  resolveInitialRoute,
  resolveMobileRole,
  resolveRouteAccess,
  resolveRouteArea,
} from './role-navigation';

describe('política de navegação por role', () => {
  it('aceita somente student e trainer', () => {
    expect(resolveMobileRole('student')).toBe('student');
    expect(resolveMobileRole('trainer')).toBe('trainer');
    expect(resolveMobileRole('admin')).toBeNull();
    expect(resolveMobileRole(undefined)).toBeNull();
  });

  it('resolve as áreas a partir dos grupos do Expo Router', () => {
    expect(resolveRouteArea(['(auth)', 'login'])).toBe('auth');
    expect(resolveRouteArea(['(student)', '(tabs)', 'index'])).toBe('student');
    expect(resolveRouteArea(['(trainer)', 'trainer', '(tabs)'])).toBe('trainer');
    expect(resolveRouteArea(['outside'])).toBe('unknown');
  });

  it('retorna o início correto de cada role', () => {
    expect(resolveInitialRoute('student')).toBe(mobileRoutes.studentHome);
    expect(resolveInitialRoute('trainer')).toBe(mobileRoutes.trainerHome);
    expect(resolveInitialRoute('legacy')).toBeNull();
  });

  it('protege visitante, troca a role oposta e bloqueia papel desconhecido', () => {
    expect(
      resolveRouteAccess({ isAuthenticated: false, role: undefined, area: 'student' }),
    ).toEqual({
      kind: 'redirect',
      href: mobileRoutes.login,
      reason: 'unauthenticated',
    });
    expect(resolveRouteAccess({ isAuthenticated: true, role: 'student', area: 'trainer' })).toEqual(
      {
        kind: 'redirect',
        href: mobileRoutes.studentHome,
        reason: 'wrong-role',
      },
    );
    expect(resolveRouteAccess({ isAuthenticated: true, role: 'trainer', area: 'student' })).toEqual(
      {
        kind: 'redirect',
        href: mobileRoutes.trainerHome,
        reason: 'wrong-role',
      },
    );
    expect(resolveRouteAccess({ isAuthenticated: true, role: 'unknown', area: 'student' })).toEqual(
      {
        kind: 'unsupported-role',
        href: mobileRoutes.login,
      },
    );
  });
});
