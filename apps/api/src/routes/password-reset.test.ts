import { db } from '@muvit/db';
import { authSessions, authVerifications } from '@muvit/db/schema';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';
import { env } from '../env.js';
import { createDrizzleAuth } from '../modules/auth/repositories/drizzle-auth.js';

type ResetMessage = { user: { email: string; name: string }; url: string };
let app: FastifyInstance;
let messages: ResetMessage[];

beforeEach(async () => {
  await truncateAll();
  messages = [];
  app = await buildTestApp({
    sendResetPassword: async (message: ResetMessage) => {
      messages.push(message);
    },
  });
});
afterEach(async () => {
  await app.close();
});
afterAll(closeDb);

async function register() {
  return signUpWithSession(app, {
    name: 'Ana Lima',
    email: 'ana@example.com',
    password: 'senha-antiga-123',
    role: 'trainer',
  });
}
async function requestReset(email: string, redirectTo = `${env.WEB_URL}/reset-password`) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/request-password-reset',
    payload: { email, redirectTo },
  });
}
function deliveredToken(): string {
  const message = messages[0];
  if (!message) throw new Error('Email de recuperação não foi entregue');
  const token = new URL(message.url).pathname.split('/').at(-1);
  if (!token) throw new Error('Token ausente');
  return token;
}
async function reset(token: string, newPassword = 'nova-senha-456') {
  return app.inject({
    method: 'POST',
    url: '/api/auth/reset-password',
    payload: { token, newPassword },
  });
}

describe('recuperação de senha nativa', () => {
  it('limita solicitações repetidas por IP nos dois endpoints públicos', async () => {
    for (const url of ['/api/auth/request-password-reset', '/api/auth/reset-password']) {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const response = await app.inject({
          method: 'POST',
          url,
          remoteAddress: '192.0.2.12',
          payload: url.endsWith('/request-password-reset')
            ? { email: 'ausente@example.com' }
            : { token: 'invalido', newPassword: 'nova-senha-456' },
        });
        expect(response.statusCode).not.toBe(429);
      }
      const blocked = await app.inject({
        method: 'POST',
        url,
        remoteAddress: '192.0.2.12',
        payload: { email: 'ausente@example.com', token: 'invalido', newPassword: 'nova-senha-456' },
      });
      expect(blocked.statusCode).toBe(429);
    }
  });
  it('responde igualmente para conta existente e ausente sem devolver o token', async () => {
    await register();
    const existing = await requestReset('ana@example.com');
    const missing = await requestReset('ausente@example.com');
    expect(existing.statusCode).toBe(200);
    expect(missing.statusCode).toBe(existing.statusCode);
    expect(missing.json()).toEqual(existing.json());
    expect(messages).toHaveLength(1);
    expect(messages[0]?.user.email).toBe('ana@example.com');
    expect(existing.body).not.toContain(deliveredToken());
    const verifications = await db.select().from(authVerifications);
    expect(verifications).toHaveLength(1);
    expect(verifications[0]?.expiresAt.getTime()).toBeGreaterThan(Date.now() + 3590_000);
    expect(verifications[0]?.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 3600_000);
  });

  it('troca a senha, rejeita a antiga e revoga as sessões anteriores', async () => {
    const { cookie } = await register();
    await requestReset('ana@example.com');
    expect((await reset(deliveredToken())).statusCode).toBe(200);
    expect(await db.select().from(authSessions)).toHaveLength(0);
    const session = await app.inject({
      method: 'GET',
      url: '/api/auth/get-session',
      headers: { cookie },
    });
    expect(session.json()).toBeNull();
    const oldLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: 'ana@example.com', password: 'senha-antiga-123' },
    });
    const newLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: 'ana@example.com', password: 'nova-senha-456' },
    });
    expect(oldLogin.statusCode).toBe(401);
    expect(newLogin.statusCode).toBe(200);
    expect(newLogin.headers['set-cookie']).toBeDefined();
  });

  it('rejeita token inválido, expirado e reutilizado', async () => {
    await register();
    expect((await reset('token-invalido')).statusCode).toBe(400);
    await requestReset('ana@example.com');
    const expiredToken = deliveredToken();
    await db
      .update(authVerifications)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(authVerifications.identifier, `reset-password:${expiredToken}`));
    expect((await reset(expiredToken)).statusCode).toBe(400);
    messages = [];
    await requestReset('ana@example.com');
    const token = deliveredToken();
    expect((await reset(token)).statusCode).toBe(200);
    expect((await reset(token)).statusCode).toBe(400);
  });

  it('mantém o token utilizável se a nova senha não atende ao mínimo nativo', async () => {
    await register();
    await requestReset('ana@example.com');
    const token = deliveredToken();
    expect((await reset(token, 'curta')).statusCode).toBe(400);
    expect((await reset(token)).statusCode).toBe(200);
  });

  it('não permite callback externo e aceita o deep link mobile confiável', async () => {
    await register();
    expect(
      (await requestReset('ana@example.com', 'https://externo.example/reset-password')).statusCode,
    ).toBe(403);
    expect(messages).toHaveLength(0);
    expect((await requestReset('ana@example.com', 'muvit://reset-password')).statusCode).toBe(200);
    const message = messages[0];
    if (!message) throw new Error('Email não entregue');
    const callback = await app.inject({
      method: 'GET',
      url: new URL(message.url).pathname + new URL(message.url).search,
    });
    expect(callback.statusCode).toBe(302);
    expect(callback.headers.location).toBe(`muvit://reset-password?token=${deliveredToken()}`);
  });

  it('não registra tokens recebidos em callbacks inválidos no logger nativo', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await requestReset(
        'ana@example.com',
        'https://externo.example/reset?token=segredo-de-recuperacao',
      );
      expect(response.statusCode).toBe(403);
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain('segredo-de-recuperacao');
    } finally {
      errorLog.mockRestore();
    }
  });

  it('falha de entrega não revela existência da conta nem bloqueia a resposta', async () => {
    await app.close();
    app = await buildTestApp({
      sendResetPassword: async () => {
        throw new Error('falha do provedor com dados sensíveis');
      },
    });
    await register();
    const existing = await requestReset('ana@example.com');
    const missing = await requestReset('ausente@example.com');
    expect(existing.statusCode).toBe(200);
    expect(missing.statusCode).toBe(existing.statusCode);
    expect(existing.json()).toEqual(missing.json());
    expect(existing.body).not.toContain('sensíveis');
  });

  it('não aguarda o provedor de email antes de responder à solicitação', async () => {
    await app.close();
    let releaseDelivery: (() => void) | undefined;
    const delivery = new Promise<void>((resolve) => {
      releaseDelivery = resolve;
    });
    app = await buildTestApp({ sendResetPassword: async () => delivery });
    await register();
    try {
      const response = await Promise.race([
        requestReset('ana@example.com'),
        new Promise<never>((_resolve, reject) => {
          setTimeout(
            () => reject(new Error('A resposta aguardou o provedor de email')),
            1000,
          ).unref();
        }),
      ]);
      expect(response.statusCode).toBe(200);
    } finally {
      releaseDelivery?.();
    }
  });

  it('configuração ausente retorna indisponibilidade igual para qualquer conta', async () => {
    await register();
    const auth = createDrizzleAuth({
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
      trustedOrigins: [env.WEB_URL],
    });
    const responses = await Promise.all(
      ['ana@example.com', 'ausente@example.com'].map((email: string) =>
        auth.handler(
          new Request(`${env.BETTER_AUTH_URL}/api/auth/request-password-reset`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, redirectTo: `${env.WEB_URL}/reset-password` }),
          }),
        ),
      ),
    );
    expect(responses[0]?.status).toBe(503);
    expect(responses[1]?.status).toBe(503);
    expect(await responses[0]?.json()).toEqual(await responses[1]?.json());
  });
});
