import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';

function request(path: string, access?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: access ? { cookie: `muvit_access=${access}` } : undefined,
  });
}

describe('proxy', () => {
  it('redireciona visitante sem token para login preservando a rota', () => {
    const response = proxy(request('/students'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fstudents');
  });

  it('redireciona usuario autenticado para dashboard ao abrir login', () => {
    const response = proxy(request('/login', 'token'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('mantem a landing page publica', () => {
    const response = proxy(request('/'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});
