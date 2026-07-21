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

  it('redireciona sessão presente para dashboard ao abrir login', () => {
    getSessionCookie.mockReturnValue('session');
    const req = request('/login');
    const response = proxy(req);

    expect(getSessionCookie).toHaveBeenCalledWith(req, { cookiePrefix: 'muvit' });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
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
});
