import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, type Fetcher } from './api';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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
});
