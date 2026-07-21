import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthErrorMessage } from './auth-errors';

const clientMocks = vi.hoisted(() => ({
  createAuthClient: vi.fn(() => ({ client: true })),
  expoClient: vi.fn(() => ({ expoPlugin: true })),
  inferAdditionalFields: vi.fn(() => ({ fieldsPlugin: true })),
}));

const secureStore = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock('better-auth/react', () => ({
  createAuthClient: clientMocks.createAuthClient,
}));

vi.mock('@better-auth/expo/client', () => ({
  expoClient: clientMocks.expoClient,
}));

vi.mock('better-auth/client/plugins', () => ({
  inferAdditionalFields: clientMocks.inferAdditionalFields,
}));

vi.mock('expo-secure-store', () => secureStore);

vi.mock('./config', () => ({
  config: { apiUrl: 'https://api.muvit.test' },
}));

describe('cliente de autenticação mobile', () => {
  afterEach(() => {
    vi.resetModules();
    clientMocks.createAuthClient.mockClear();
    clientMocks.expoClient.mockClear();
    clientMocks.inferAdditionalFields.mockClear();
  });

  it('configura o plugin Expo com SecureStore e prefixos próprios', async () => {
    await import('./auth-client');

    expect(clientMocks.expoClient).toHaveBeenCalledWith({
      scheme: 'muvit',
      storagePrefix: 'muvit_auth',
      cookiePrefix: 'muvit',
      storage: secureStore,
    });
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
      plugins: [{ expoPlugin: true }, { fieldsPlugin: true }],
    });
  });
});

describe('mensagens de erro de autenticação mobile', () => {
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
