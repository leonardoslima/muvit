import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthErrorMessage } from './auth-errors';

const clientMocks = vi.hoisted(() => ({
  createAuthClient: vi.fn(() => ({ client: true })),
  inferAdditionalFields: vi.fn(() => ({ plugin: true })),
}));

vi.mock('better-auth/react', () => ({
  createAuthClient: clientMocks.createAuthClient,
}));

vi.mock('better-auth/client/plugins', () => ({
  inferAdditionalFields: clientMocks.inferAdditionalFields,
}));

describe('cliente de autenticação web', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    clientMocks.createAuthClient.mockClear();
    clientMocks.inferAdditionalFields.mockClear();
  });

  it('configura a API pública e infere o papel adicional do usuário', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.muvit.test');

    await import('./auth-client');

    expect(clientMocks.inferAdditionalFields).toHaveBeenCalledWith({
      user: {
        role: {
          type: 'string',
          required: true,
        },
      },
    });
    expect(clientMocks.createAuthClient).toHaveBeenCalledWith({
      baseURL: 'https://api.muvit.test',
      plugins: [{ plugin: true }],
    });
  });
});

describe('mensagens de erro de autenticação', () => {
  it('traduz credenciais inválidas sem revelar se o e-mail existe', () => {
    expect(getAuthErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 }, 'login')).toBe(
      'Credenciais inválidas. Verifique os dados e tente novamente.',
    );
  });

  it('traduz e-mail duplicado sem confirmar uma conta existente', () => {
    expect(getAuthErrorMessage({ code: 'USER_ALREADY_EXISTS', status: 422 }, 'signup')).toBe(
      'Não foi possível criar a conta com os dados informados.',
    );
  });

  it('traduz limite de requisições', () => {
    expect(getAuthErrorMessage({ status: 429 }, 'login')).toBe(
      'Muitas tentativas. Aguarde um momento e tente novamente.',
    );
  });

  it('usa mensagem estável para falha inesperada', () => {
    expect(getAuthErrorMessage(new Error('segredo interno'), 'signup')).toBe(
      'Não foi possível concluir a solicitação. Tente novamente.',
    );
  });
});
