import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(url);
  }),
}));

vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import { getCurrentUser, requireUser } from './auth-server';

describe('getCurrentUser', () => {
  beforeEach(() => {
    mocks.headers.mockReset();
    mocks.redirect.mockClear();
    vi.restoreAllMocks();
  });

  it('consulta a sessao Better Auth encaminhando o cookie original', async () => {
    const cookie = 'muvit.session_token=session-token; theme=dark';
    mocks.headers.mockResolvedValue(new Headers({ cookie }));
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          session: { id: 'session-id' },
          user: {
            id: 'auth-user-id',
            name: 'Treinador Muvit',
            email: 'trainer@muvit.dev',
            role: 'trainer',
            image: 'https://cdn.muvit.test/avatar.png',
            emailVerified: true,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(getCurrentUser()).resolves.toEqual({
      id: 'auth-user-id',
      name: 'Treinador Muvit',
      email: 'trainer@muvit.dev',
      role: 'trainer',
      image: 'https://cdn.muvit.test/avatar.png',
      emailVerified: true,
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3333/api/auth/get-session',
      expect.objectContaining({
        credentials: 'include',
        cache: 'no-store',
        headers: expect.any(Headers),
      }),
    );
    const requestHeaders = fetchSpy.mock.calls[0]?.[1]?.headers;
    expect(new Headers(requestHeaders).get('cookie')).toBe(cookie);
  });

  it('retorna null quando a sessao nao esta autenticada', async () => {
    mocks.headers.mockResolvedValue(new Headers());
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('retorna null quando o payload nao traz usuario', async () => {
    mocks.headers.mockResolvedValue(new Headers({ cookie: 'muvit.session_token=invalido' }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('null', { status: 200, headers: { 'content-type': 'application/json' } }),
    );

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('redireciona para login quando a sessao esta ausente', async () => {
    mocks.headers.mockResolvedValue(new Headers({ cookie: 'muvit.session_token=invalido' }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));

    await expect(requireUser()).rejects.toThrow('/login');
    expect(mocks.redirect).toHaveBeenCalledWith('/login');
  });

  it('propaga indisponibilidade da API sem tratar como logout', async () => {
    mocks.headers.mockResolvedValue(new Headers({ cookie: 'muvit.session_token=valido' }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));

    await expect(getCurrentUser()).rejects.toThrow('Falha ao consultar a sessão atual.');
    await expect(requireUser()).rejects.toThrow('Falha ao consultar a sessão atual.');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('propaga erro de rede sem redirecionar', async () => {
    mocks.headers.mockResolvedValue(new Headers({ cookie: 'muvit.session_token=valido' }));
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    await expect(getCurrentUser()).rejects.toThrow('fetch failed');
    await expect(requireUser()).rejects.toThrow('fetch failed');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('encaminha sessão pendente para confirmação', async () => {
    mocks.headers.mockResolvedValue(new Headers({ cookie: 'session=1' }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: '1',
            name: 'Ana',
            email: 'ana@example.com',
            role: 'trainer',
            image: null,
            emailVerified: false,
          },
        }),
        { status: 200 },
      ),
    );
    await expect(requireUser()).rejects.toThrow('/verify-email');
  });
});
