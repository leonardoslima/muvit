import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError, ApiTransportError, type Fetcher, parseResponse } from './api';

function createClient({
  fetcher,
  cookie = 'muvit.session_token=session-value',
  getCookie,
  onUnauthorized = vi.fn(),
}: {
  fetcher?: Fetcher;
  cookie?: string;
  getCookie?: () => string;
  onUnauthorized?: () => void | Promise<void>;
}) {
  return new ApiClient({
    baseUrl: 'https://api.muvit.test/',
    fetcher,
    getCookie: getCookie ?? (() => cookie),
    onUnauthorized,
  });
}

describe('ApiClient', () => {
  it('classifica rejeicao do fetch nativo como erro de transporte tipado', async () => {
    const transportCause = new TypeError('Network request failed');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(transportCause);
    const client = createClient({});

    try {
      const rejection = await client.request('/students/me').catch((error: unknown) => error);

      expect(rejection).toBeInstanceOf(ApiTransportError);
      if (!(rejection instanceof ApiTransportError)) {
        throw new Error('A rejeição não preservou a classe ApiTransportError.');
      }
      expect(rejection.cause).toBe(transportCause);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('encaminha o cookie nativo sem Authorization e omite credenciais do runtime', async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createClient({ fetcher });

    await expect(client.request('/students/me')).resolves.toEqual({ ok: true });

    const init = fetcher.mock.calls[0]?.[1];
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.muvit.test/students/me');
    expect(init?.headers).toBeInstanceOf(Headers);
    expect((init?.headers as Headers).get('cookie')).toBe('muvit.session_token=session-value');
    expect((init?.headers as Headers).has('authorization')).toBe(false);
    expect(init?.credentials).toBe('omit');
  });

  it('em 401 encerra a sessão uma vez, propaga o erro e não repete a request', async () => {
    const onUnauthorized = vi.fn();
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
      );
    const legacyRefreshPath = ['auth', 'refresh'].join('/');
    const client = createClient({ fetcher, onUnauthorized });

    await expect(client.request('/students/me')).rejects.toEqual(new ApiError('unauthorized', 401));

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls.some(([url]) => url.endsWith(legacyRefreshPath))).toBe(false);
  });

  it('mantém o cookie capturado em todas as requests vinculadas', async () => {
    let cookie = 'session=A';
    const fetcher = vi
      .fn<Fetcher>()
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
      );
    const client = createClient({ fetcher, getCookie: () => cookie });
    const bound = client.bindCurrentSession();

    await bound.request('/workout-logs', { method: 'POST' });
    cookie = 'session=B';
    await bound.request('/workout-logs/log-a/finish', { method: 'PATCH' });

    expect(fetcher.mock.calls.map(([, init]) => (init?.headers as Headers).get('cookie'))).toEqual([
      'session=A',
      'session=A',
    ]);
  });

  it('não encerra B quando um requester capturado de A recebe 401 tardio', async () => {
    let cookie = 'session=A';
    const onUnauthorized = vi.fn();
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }));
    const client = createClient({ fetcher, getCookie: () => cookie, onUnauthorized });
    const bound = client.bindCurrentSession();
    cookie = 'session=B';

    await expect(bound.request('/workout-logs/log-a/finish')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('permite request pública explicitamente sem cookie', async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createClient({ fetcher, cookie: '' });

    await expect(client.request('/health', {}, { allowAnonymous: true })).resolves.toEqual({
      ok: true,
    });

    const init = fetcher.mock.calls[0]?.[1];
    expect((init?.headers as Headers).has('cookie')).toBe(false);
    expect(init?.credentials).toBe('omit');
  });

  it('não envia request privada quando o cookie está ausente', async () => {
    const onUnauthorized = vi.fn();
    const fetcher = vi.fn<Fetcher>();
    const client = createClient({ fetcher, cookie: '', onUnauthorized });

    await expect(client.request('/students/me')).rejects.toEqual(new ApiError('unauthorized', 401));

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('preserva content-type explícito em requests com corpo', async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createClient({ fetcher });

    await client.request('/students/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/merge-patch+json' },
      body: JSON.stringify({ name: 'Ana' }),
    });

    const init = fetcher.mock.calls[0]?.[1];
    expect((init?.headers as Headers).get('content-type')).toBe('application/merge-patch+json');
  });

  it('adiciona content-type JSON quando o corpo não define um', async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createClient({ fetcher });

    await client.request('/students/me', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Ana' }),
    });

    const init = fetcher.mock.calls[0]?.[1];
    expect((init?.headers as Headers).get('content-type')).toBe('application/json');
  });

  it('interpreta resposta de sucesso vazia como null', async () => {
    await expect(parseResponse(new Response(null, { status: 204 }))).resolves.toBeNull();
  });

  it('usa mensagem segura quando o erro não possui campo error textual', async () => {
    await expect(
      parseResponse(new Response(JSON.stringify({ message: 'bad' }), { status: 500 })),
    ).rejects.toEqual(new ApiError('request failed with status 500', 500));
  });
});
