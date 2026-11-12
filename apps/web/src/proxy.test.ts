import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { proxy } from './proxy';

const getSessionCookie = vi.hoisted(() => vi.fn());

vi.mock('better-auth/cookies', () => ({
  getSessionCookie,
}));

function request(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

describe('proxy', () => {
  beforeEach(() => {
    getSessionCookie.mockReset();
    getSessionCookie.mockReturnValue(null);
  });

  it('redireciona visitante sem sessão para login preservando a rota', () => {
    const req = request('/students');
    const response = proxy(req);

    expect(getSessionCookie).toHaveBeenCalledWith(req, { cookiePrefix: 'muvit' });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fstudents');
  });

  it.each(['/login', '/signup'])(
    'permite abrir %s mesmo com cookie de sessão presente',
    (path: string) => {
      getSessionCookie.mockReturnValue('session');
      const response = proxy(request(path));

      expect(getSessionCookie).toHaveBeenCalledWith(expect.any(NextRequest), {
        cookiePrefix: 'muvit',
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('x-middleware-next')).toBe('1');
      expect(response.headers.get('location')).toBeNull();
    },
  );

  it('não entra em ciclo quando a sessão é inválida e o cookie permanece presente', () => {
    getSessionCookie.mockReturnValue('invalid-session');
    const dashboard = proxy(request('/dashboard'));
    expect(dashboard.headers.get('x-middleware-next')).toBe('1');

    const login = proxy(request('/login'));
    expect(login.headers.get('x-middleware-next')).toBe('1');
    expect(login.headers.get('location')).toBeNull();
  });

  it('trata o cookie somente como sinal otimista para liberar rota protegida', () => {
    getSessionCookie.mockReturnValue('session');
    const response = proxy(request('/students'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('mantem a landing page publica', () => {
    const response = proxy(request('/'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
  it('mantém a confirmação acessível com e sem sessão', () => {
    expect(proxy(request('/verify-email')).headers.get('x-middleware-next')).toBe('1');
    getSessionCookie.mockReturnValue('session');
    expect(proxy(request('/verify-email')).headers.get('x-middleware-next')).toBe('1');
  });
  it.each([
    '/forgot-password',
    '/reset-password?token=valid',
    '/reset-password?error=INVALID_TOKEN',
  ])('permite recuperação sem sessão em %s', (path: string) => {
    expect(proxy(request(path)).headers.get('x-middleware-next')).toBe('1');
  });
  it.each(['/forgot-password', '/reset-password?token=valid'])(
    'preserva recuperação mesmo com cookie em %s',
    (path: string) => {
      getSessionCookie.mockReturnValue('session');
      expect(proxy(request(path)).headers.get('x-middleware-next')).toBe('1');
    },
  );
});
