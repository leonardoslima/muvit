import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError, type Fetcher, parseResponse } from './api';

describe('ApiClient', () => {
  it('renova o access token uma vez e repete a requisicao original', async () => {
    let accessToken = 'access-antigo';
    const setTokens = vi.fn((nextAccessToken: string) => {
      accessToken = nextAccessToken;
    });
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'novo-access' }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const client = new ApiClient({
      baseUrl: 'https://api.muvit.test',
      fetcher,
      getAccessToken: () => accessToken,
      getRefreshToken: () => 'refresh-token',
      setAccessToken: setTokens,
      clearAuth: vi.fn(),
    });

    await expect(client.request('/auth/me')).resolves.toEqual({ ok: true });
    expect(setTokens).toHaveBeenCalledWith('novo-access');
    const retryInit = fetcher.mock.calls[2]?.[1];
    expect(fetcher.mock.calls[2]?.[0]).toBe('https://api.muvit.test/auth/me');
    expect(retryInit?.headers).toBeInstanceOf(Headers);
    expect((retryInit?.headers as Headers).get('authorization')).toBe('Bearer novo-access');
  });

  it('limpa auth quando refresh falha', async () => {
    const clearAuth = vi.fn();
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'invalid refresh token' }), { status: 401 }),
      );

    const client = new ApiClient({
      baseUrl: 'https://api.muvit.test',
      fetcher,
      getAccessToken: () => 'access-antigo',
      getRefreshToken: () => 'refresh-token',
      setAccessToken: vi.fn(),
      clearAuth,
    });

    await expect(client.request('/auth/me')).rejects.toThrow('invalid refresh token');
    expect(clearAuth).toHaveBeenCalledOnce();
  });

  it('limpa auth sem refresh token e retorna o erro original', async () => {
    const clearAuth = vi.fn();
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
      );

    const client = new ApiClient({
      baseUrl: 'https://api.muvit.test/',
      fetcher,
      getAccessToken: () => undefined,
      getRefreshToken: () => undefined,
      setAccessToken: vi.fn(),
      clearAuth,
    });

    await expect(client.request('auth/me')).rejects.toMatchObject({
      message: 'unauthorized',
      status: 401,
    });
    expect(fetcher).toHaveBeenCalledWith('https://api.muvit.test/auth/me', {
      headers: expect.any(Headers),
    });
    expect(clearAuth).toHaveBeenCalledOnce();
  });

  it('adds content type for request bodies without overwriting existing headers', async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = new ApiClient({
      baseUrl: 'https://api.muvit.test',
      fetcher,
      getAccessToken: () => 'access-token',
      getRefreshToken: () => undefined,
      setAccessToken: vi.fn(),
      clearAuth: vi.fn(),
    });

    await client.request('/students/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/merge-patch+json' },
      body: JSON.stringify({ name: 'Ana' }),
    });

    const init = fetcher.mock.calls[0]?.[1];
    expect(init?.headers).toBeInstanceOf(Headers);
    expect((init?.headers as Headers).get('authorization')).toBe('Bearer access-token');
    expect((init?.headers as Headers).get('content-type')).toBe('application/merge-patch+json');
  });

  it('parses empty successful responses as null', async () => {
    await expect(parseResponse(new Response(null, { status: 204 }))).resolves.toBeNull();
  });

  it('uses a fallback error message when the API error body has no string error', async () => {
    await expect(
      parseResponse(new Response(JSON.stringify({ message: 'bad' }), { status: 500 })),
    ).rejects.toEqual(new ApiError('request failed with status 500', 500));
  });

  it('rejects invalid refresh payloads without retrying forever', async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'missing-field' })));

    const client = new ApiClient({
      baseUrl: 'https://api.muvit.test',
      fetcher,
      getAccessToken: () => 'access-token',
      getRefreshToken: () => 'refresh-token',
      setAccessToken: vi.fn(),
      clearAuth: vi.fn(),
    });

    await expect(client.request('/auth/me')).rejects.toThrow(
      'invalid response: missing accessToken',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
