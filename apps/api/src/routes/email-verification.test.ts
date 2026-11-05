import { createHmac } from 'node:crypto';
import { db, queryClient } from '@muvit/db';
import { authUsers, trainers } from '@muvit/db/schema';
import { createEmailVerificationToken } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookieHeaderFromSetCookie } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';
import { env } from '../env.js';
import { createDrizzleAuthAdapter } from '../modules/auth/repositories/drizzle-auth-adapter.js';
import { createDrizzleAuth } from '../modules/auth/repositories/drizzle-auth.js';

type VerificationMessage = { user: { name: string; email: string }; url: string };
let app: FastifyInstance;
let messages: VerificationMessage[];

beforeEach(async () => {
  await truncateAll();
  messages = [];
  app = await buildTestApp({
    sendVerificationEmail: async (message: VerificationMessage) => {
      messages.push(message);
    },
  });
  app.get('/verification-protected', { preHandler: [app.requireAuth] }, async () => ({ ok: true }));
});
afterEach(async () => {
  await app.close();
});
afterAll(closeDb);

async function register(callbackURL = `${env.WEB_URL}/verify-email`) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    payload: {
      name: 'Ana Lima',
      email: 'ana@example.com',
      password: 'senha-segura-123',
      role: 'trainer',
      callbackURL,
    },
  });
  return { response, cookie: cookieHeaderFromSetCookie(response.headers['set-cookie']) };
}
function deliveredPath() {
  const message = messages[0];
  if (!message) throw new Error('Email de confirmação ausente');
  const url = new URL(message.url);
  if (url.origin === new URL(env.WEB_URL).origin && url.pathname === '/verify-email') {
    const token = new URLSearchParams(url.hash.slice(1)).get('token') ?? '';
    const params = new URLSearchParams({ token, callbackURL: `${env.WEB_URL}/verify-email` });
    return `/api/auth/verify-email?${params}`;
  }
  return url.pathname + url.search;
}

describe('confirmação nativa de email', () => {
  it('provisiona perfil, envia link e protege dados até confirmação', async () => {
    const { response, cookie } = await register();
    expect(response.statusCode).toBe(200);
    const user = response.json<{ user: { id: string; emailVerified: boolean } }>().user;
    expect(user.emailVerified).toBe(false);
    expect(
      await db.query.trainers.findFirst({ where: eq(trainers.authUserId, user.id) }),
    ).toBeDefined();
    expect(messages).toHaveLength(1);
    expect(messages[0]?.user.email).toBe('ana@example.com');
    const pending = await app.inject({
      method: 'GET',
      url: '/verification-protected',
      headers: { cookie },
    });
    expect(pending.statusCode).toBe(403);
    expect(pending.json()).toEqual({ error: 'email_not_verified' });
    expect((await app.inject({ method: 'GET', url: deliveredPath() })).statusCode).toBe(302);
    expect(
      (await app.inject({ method: 'GET', url: '/verification-protected', headers: { cookie } }))
        .statusCode,
    ).toBe(200);
  });

  it('rejeita callback externo antes de enviar ou cadastrar', async () => {
    const { response } = await register('https://externo.example/verify-email');
    expect(response.statusCode).toBe(403);
    expect(messages).toHaveLength(0);
  });

  it('rejeita tokens inválidos e não expõe credenciais', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/verify-email?token=invalido',
    });
    expect(response.statusCode).toBe(401);
    expect(response.body).not.toContain('invalido');
  });

  it('rejeita token expirado sem verificar a conta', async () => {
    const { cookie } = await register();
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ email: 'ana@example.com', exp: 1 })).toString(
      'base64url',
    );
    const content = `${header}.${payload}`;
    const token = `${content}.${createHmac('sha256', env.BETTER_AUTH_SECRET).update(content).digest('base64url')}`;
    const response = await app.inject({
      method: 'GET',
      url: `/api/auth/verify-email?token=${token}`,
    });
    expect(response.statusCode).toBe(401);
    expect(
      (await app.inject({ method: 'GET', url: '/verification-protected', headers: { cookie } }))
        .statusCode,
    ).toBe(403);
  });

  it('rejeita token nativo válido sem identidade vinculada', async () => {
    const { cookie } = await register();
    const token = await createEmailVerificationToken(env.BETTER_AUTH_SECRET, 'ana@example.com');
    const response = await app.inject({
      method: 'GET',
      url: `/api/auth/verify-email?token=${token}`,
    });
    expect(response.statusCode).toBe(401);
    expect(
      (await app.inject({ method: 'GET', url: '/verification-protected', headers: { cookie } }))
        .statusCode,
    ).toBe(403);
  });

  it('redireciona token sem vínculo apenas para callbacks confiáveis', async () => {
    await register();
    const token = await createEmailVerificationToken(env.BETTER_AUTH_SECRET, 'ana@example.com');
    for (const callback of [`${env.WEB_URL}/verify-email`, 'muvit://verify-email']) {
      const query = new URLSearchParams({ token, callbackURL: callback });
      const response = await app.inject({ method: 'GET', url: `/api/auth/verify-email?${query}` });
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(`${callback}?error=INVALID_TOKEN`);
    }
    const query = new URLSearchParams({
      token,
      callbackURL: 'https://externo.example/verify-email',
    });
    const response = await app.inject({ method: 'GET', url: `/api/auth/verify-email?${query}` });
    expect(response.statusCode).toBe(401);
    expect(response.headers.location).toBeUndefined();
  });

  it('não aceita token sem vínculo por variantes de caminho', async () => {
    const { response } = await register();
    const authUserId = response.json<{ user: { id: string } }>().user.id;
    const token = await createEmailVerificationToken(env.BETTER_AUTH_SECRET, 'ana@example.com');
    for (const pathname of ['/api/auth/%76erify-email', '/api/auth/verify-email/']) {
      const result = await app.inject({ method: 'GET', url: `${pathname}?token=${token}` });
      expect(result.statusCode).not.toBe(200);
    }
    expect(
      (await db.query.authUsers.findFirst({ where: eq(authUsers.id, authUserId) }))?.emailVerified,
    ).toBe(false);
  });

  it('aceita link repetido enquanto válido e mantém a conta verificada', async () => {
    const { cookie } = await register();
    const path = deliveredPath();
    expect((await app.inject({ method: 'GET', url: path })).statusCode).toBe(302);
    expect((await app.inject({ method: 'GET', url: path })).statusCode).toBe(302);
    expect(
      (await app.inject({ method: 'GET', url: '/verification-protected', headers: { cookie } }))
        .statusCode,
    ).toBe(200);
  });

  it('não entrega para callback externo no reenvio', async () => {
    await register();
    messages = [];
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/send-verification-email',
      payload: { email: 'ana@example.com', callbackURL: 'https://externo.example/verify-email' },
    });
    expect(response.statusCode).toBe(403);
    expect(messages).toHaveLength(0);
  });

  it('não permite que uma sessão solicite confirmação para outra conta', async () => {
    const { cookie } = await register();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/send-verification-email',
      headers: { cookie, origin: env.WEB_URL },
      payload: { email: 'outra@example.com', callbackURL: `${env.WEB_URL}/verify-email` },
    });
    expect(response.statusCode).toBe(400);
    expect(messages).toHaveLength(1);
  });

  it('responde de forma genérica para email existente e ausente sem sessão', async () => {
    await register();
    messages = [];
    const send = (email: string) =>
      app.inject({
        method: 'POST',
        url: '/api/auth/send-verification-email',
        payload: { email, callbackURL: `${env.WEB_URL}/verify-email` },
      });
    const existing = await send('ana@example.com');
    const missing = await send('ausente@example.com');
    expect(existing.statusCode).toBe(200);
    expect(missing.statusCode).toBe(200);
    expect(existing.json()).toEqual(missing.json());
    expect(messages).toHaveLength(1);
  });

  it('sem provedor retorna indisponibilidade uniforme no reenvio', async () => {
    const auth = createDrizzleAuth({
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
      trustedOrigins: [env.WEB_URL],
    });
    const send = (email: string) =>
      auth.handler(
        new Request(`${env.BETTER_AUTH_URL}/api/auth/send-verification-email`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email }),
        }),
      );
    const first = await send('ana@example.com');
    const second = await send('ausente@example.com');
    expect(first.status).toBe(503);
    expect(second.status).toBe(503);
    expect(await first.json()).toEqual(await second.json());
  });

  it('falha de entrega não impede cadastro nem expõe dados do provedor', async () => {
    await app.close();
    app = await buildTestApp({
      sendVerificationEmail: async () => {
        throw new Error('segredo do provedor');
      },
    });
    const { response } = await register();
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain('segredo do provedor');
    const authUserId = response.json<{ user: { id: string } }>().user.id;
    expect(
      await db.query.trainers.findFirst({ where: eq(trainers.authUserId, authUserId) }),
    ).toBeDefined();
  });

  it('limita reenvio por IP', async () => {
    for (let index = 0; index < 3; index += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/send-verification-email',
        remoteAddress: '192.0.2.55',
        payload: { email: 'ausente@example.com', callbackURL: `${env.WEB_URL}/verify-email` },
      });
      expect(response.statusCode).toBe(200);
    }
    const limited = await app.inject({
      method: 'POST',
      url: '/api/auth/send-verification-email',
      remoteAddress: '192.0.2.55',
      payload: { email: 'ausente@example.com', callbackURL: `${env.WEB_URL}/verify-email` },
    });
    expect(limited.statusCode).toBe(429);
  });

  it('mantém email anterior até confirmação da troca solicitada pelo perfil', async () => {
    const { response, cookie } = await register();
    const authUserId = response.json<{ user: { id: string } }>().user.id;
    await app.inject({ method: 'GET', url: deliveredPath() });
    messages = [];
    const update = await app.inject({
      method: 'PATCH',
      url: '/trainers/me',
      headers: { cookie },
      payload: { email: 'novo@example.com' },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().email).toBe('ana@example.com');
    expect(
      (await db.query.authUsers.findFirst({ where: eq(authUsers.id, authUserId) }))?.email,
    ).toBe('ana@example.com');
    expect(messages[0]?.user.email).toBe('novo@example.com');
    expect(new URL(messages[0]?.url ?? '').origin).toBe(new URL(env.WEB_URL).origin);
  });

  it('não entrega link de troca quando a persistência do perfil falha', async () => {
    const { cookie } = await register();
    await app.inject({ method: 'GET', url: deliveredPath() });
    messages = [];
    await queryClient.unsafe(
      `CREATE OR REPLACE FUNCTION fail_verification_profile_test() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'falha controlada'; END; $$ LANGUAGE plpgsql`,
    );
    await queryClient.unsafe(
      'CREATE TRIGGER fail_verification_profile_test BEFORE UPDATE ON trainers FOR EACH ROW EXECUTE FUNCTION fail_verification_profile_test()',
    );
    try {
      const update = await app.inject({
        method: 'PATCH',
        url: '/trainers/me',
        headers: { cookie },
        payload: { email: 'novo@example.com', name: 'Novo Nome' },
      });
      expect(update.statusCode).toBe(500);
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(messages).toHaveLength(0);
    } finally {
      await queryClient.unsafe('DROP TRIGGER IF EXISTS fail_verification_profile_test ON trainers');
      await queryClient.unsafe('DROP FUNCTION IF EXISTS fail_verification_profile_test()');
    }
  });

  it('confirma troca apenas com a sessão correta e sincroniza perfil', async () => {
    const { response, cookie } = await register();
    const authUserId = response.json<{ user: { id: string } }>().user.id;
    await app.inject({ method: 'GET', url: deliveredPath() });
    messages = [];
    const update = await app.inject({
      method: 'PATCH',
      url: '/trainers/me',
      headers: { cookie },
      payload: { email: 'novo@example.com' },
    });
    expect(update.statusCode).toBe(200);
    const path = deliveredPath();
    const withoutSession = await app.inject({ method: 'GET', url: path });
    expect(withoutSession.headers['set-cookie']).toBeUndefined();
    expect(
      (await db.query.authUsers.findFirst({ where: eq(authUsers.id, authUserId) }))?.email,
    ).toBe('ana@example.com');
    expect((await app.inject({ method: 'GET', url: path, headers: { cookie } })).statusCode).toBe(
      302,
    );
    expect(
      (await db.query.authUsers.findFirst({ where: eq(authUsers.id, authUserId) }))?.email,
    ).toBe('novo@example.com');
    expect(
      (await db.query.trainers.findFirst({ where: eq(trainers.authUserId, authUserId) }))?.email,
    ).toBe('novo@example.com');
  });

  it('desfaz a troca quando a sincronização falha e permite repetir o link', async () => {
    const { response, cookie } = await register();
    const authUserId = response.json<{ user: { id: string } }>().user.id;
    await app.inject({ method: 'GET', url: deliveredPath() });
    messages = [];
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/trainers/me',
          headers: { cookie },
          payload: { email: 'novo@example.com' },
        })
      ).statusCode,
    ).toBe(200);
    const path = deliveredPath();
    await queryClient.unsafe(
      `CREATE OR REPLACE FUNCTION fail_verification_sync_test() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'falha controlada'; END; $$ LANGUAGE plpgsql`,
    );
    await queryClient.unsafe(
      'CREATE TRIGGER fail_verification_sync_test BEFORE UPDATE ON trainers FOR EACH ROW EXECUTE FUNCTION fail_verification_sync_test()',
    );
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(
        (await app.inject({ method: 'GET', url: path, headers: { cookie } })).statusCode,
      ).toBeGreaterThanOrEqual(400);
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain('novo@example.com');
      expect(
        (await db.query.authUsers.findFirst({ where: eq(authUsers.id, authUserId) }))?.email,
      ).toBe('ana@example.com');
      expect(
        (await db.query.trainers.findFirst({ where: eq(trainers.authUserId, authUserId) }))?.email,
      ).toBe('ana@example.com');
    } finally {
      errorLog.mockRestore();
      await queryClient.unsafe('DROP TRIGGER IF EXISTS fail_verification_sync_test ON trainers');
      await queryClient.unsafe('DROP FUNCTION IF EXISTS fail_verification_sync_test()');
    }
    expect((await app.inject({ method: 'GET', url: path, headers: { cookie } })).statusCode).toBe(
      302,
    );
    expect(
      (await db.query.trainers.findFirst({ where: eq(trainers.authUserId, authUserId) }))?.email,
    ).toBe('novo@example.com');
  });

  it('mantém identidade e perfil consistentes quando duas confirmações concorrem', async () => {
    const { response, cookie } = await register();
    const authUserId = response.json<{ user: { id: string } }>().user.id;
    await app.inject({ method: 'GET', url: deliveredPath() });
    messages = [];
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/trainers/me',
          headers: { cookie },
          payload: { email: 'novo@example.com' },
        })
      ).statusCode,
    ).toBe(200);
    const path = deliveredPath();
    const responses = await Promise.all(
      [0, 1].map(() => app.inject({ method: 'GET', url: path, headers: { cookie } })),
    );
    expect(responses.some((result) => result.statusCode === 302)).toBe(true);
    const identity = await db.query.authUsers.findFirst({ where: eq(authUsers.id, authUserId) });
    const trainer = await db.query.trainers.findFirst({
      where: eq(trainers.authUserId, authUserId),
    });
    expect(identity?.email).toBe('novo@example.com');
    expect(trainer?.email).toBe(identity?.email);
  });

  it('serializa confirmação com edição concorrente do perfil', async () => {
    const { response, cookie } = await register();
    const authUserId = response.json<{ user: { id: string } }>().user.id;
    await app.inject({ method: 'GET', url: deliveredPath() });
    messages = [];
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/trainers/me',
          headers: { cookie },
          payload: { email: 'novo@example.com' },
        })
      ).statusCode,
    ).toBe(200);
    const path = deliveredPath();
    const [confirm, update] = await Promise.all([
      app.inject({ method: 'GET', url: path, headers: { cookie } }),
      app.inject({
        method: 'PATCH',
        url: '/trainers/me',
        headers: { cookie },
        payload: { name: 'Nome atualizado' },
      }),
    ]);
    expect(confirm.statusCode).toBe(302);
    expect(update.statusCode).toBe(200);
    const identity = await db.query.authUsers.findFirst({ where: eq(authUsers.id, authUserId) });
    const profile = await db.query.trainers.findFirst({
      where: eq(trainers.authUserId, authUserId),
    });
    expect(identity).toMatchObject({ email: 'novo@example.com', name: 'Nome atualizado' });
    expect(profile).toMatchObject({ email: 'novo@example.com', name: 'Nome atualizado' });
  });

  it('isola entregas concorrentes quando somente uma atualização falha', async () => {
    const first = await register();
    await app.inject({ method: 'GET', url: deliveredPath() });
    messages = [];
    const second = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: {
        name: 'Outra',
        email: 'outra@example.com',
        password: 'senha-segura-123',
        role: 'trainer',
        callbackURL: `${env.WEB_URL}/verify-email`,
      },
    });
    const secondCookie = cookieHeaderFromSetCookie(second.headers['set-cookie']);
    await app.inject({ method: 'GET', url: deliveredPath() });
    messages = [];
    await queryClient.unsafe(
      `CREATE OR REPLACE FUNCTION fail_one_profile_test() RETURNS trigger AS $$ BEGIN IF NEW.name = 'Falha' THEN RAISE EXCEPTION 'falha controlada'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`,
    );
    await queryClient.unsafe(
      'CREATE TRIGGER fail_one_profile_test BEFORE UPDATE ON trainers FOR EACH ROW EXECUTE FUNCTION fail_one_profile_test()',
    );
    try {
      const [failed, succeeded] = await Promise.all([
        app.inject({
          method: 'PATCH',
          url: '/trainers/me',
          headers: { cookie: first.cookie },
          payload: { email: 'falha@example.com', name: 'Falha' },
        }),
        app.inject({
          method: 'PATCH',
          url: '/trainers/me',
          headers: { cookie: secondCookie },
          payload: { email: 'sucesso@example.com', name: 'Sucesso' },
        }),
      ]);
      expect(failed.statusCode).toBe(500);
      expect(succeeded.statusCode).toBe(200);
      expect(messages.map((message) => message.user.email)).toEqual(['sucesso@example.com']);
    } finally {
      await queryClient.unsafe('DROP TRIGGER IF EXISTS fail_one_profile_test ON trainers');
      await queryClient.unsafe('DROP FUNCTION IF EXISTS fail_one_profile_test()');
    }
  });

  it('reverte colisão de email do perfil mesmo sem identidade auth correspondente', async () => {
    const { response, cookie } = await register();
    const authUserId = response.json<{ user: { id: string } }>().user.id;
    await app.inject({ method: 'GET', url: deliveredPath() });
    const other = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: {
        name: 'Outra',
        email: 'outra@example.com',
        password: 'senha-segura-123',
        role: 'trainer',
      },
    });
    const otherId = other.json<{ user: { id: string } }>().user.id;
    await db
      .update(trainers)
      .set({ email: 'novo@example.com' })
      .where(eq(trainers.authUserId, otherId));
    messages = [];
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/trainers/me',
          headers: { cookie },
          payload: { email: 'novo@example.com' },
        })
      ).statusCode,
    ).toBe(200);
    const path = deliveredPath();
    expect(
      (await app.inject({ method: 'GET', url: path, headers: { cookie } })).statusCode,
    ).toBeGreaterThanOrEqual(400);
    expect(
      (await db.query.authUsers.findFirst({ where: eq(authUsers.id, authUserId) }))?.email,
    ).toBe('ana@example.com');
    expect(
      (await db.query.trainers.findFirst({ where: eq(trainers.authUserId, authUserId) }))?.email,
    ).toBe('ana@example.com');
    await db
      .update(trainers)
      .set({ email: 'outra@example.com' })
      .where(eq(trainers.authUserId, otherId));
    expect((await app.inject({ method: 'GET', url: path, headers: { cookie } })).statusCode).toBe(
      302,
    );
  });

  it('não aplica link antigo a outra identidade após reutilização do email antigo', async () => {
    const first = await register();
    await app.inject({ method: 'GET', url: deliveredPath() });
    messages = [];
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/trainers/me',
          headers: { cookie: first.cookie },
          payload: { email: 'novo@example.com' },
        })
      ).statusCode,
    ).toBe(200);
    const oldLink = deliveredPath();
    expect(
      (await app.inject({ method: 'GET', url: oldLink, headers: { cookie: first.cookie } }))
        .statusCode,
    ).toBe(302);
    messages = [];
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/trainers/me',
          headers: { cookie: first.cookie },
          payload: { email: 'final@example.com' },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'GET', url: deliveredPath(), headers: { cookie: first.cookie } }))
        .statusCode,
    ).toBe(302);
    messages = [];
    const second = await register();
    const secondId = second.response.json<{ user: { id: string } }>().user.id;
    const replay = await app.inject({
      method: 'GET',
      url: oldLink,
      headers: { cookie: second.cookie },
    });
    expect(replay.statusCode).toBe(302);
    expect(replay.headers.location).toContain('error=INVALID_TOKEN');
    expect((await db.query.authUsers.findFirst({ where: eq(authUsers.id, secondId) }))?.email).toBe(
      'ana@example.com',
    );
  });

  it('não confirma novo cadastro com link de uma identidade removida', async () => {
    const first = await register();
    const firstId = first.response.json<{ user: { id: string } }>().user.id;
    const oldLink = deliveredPath();
    await db.delete(authUsers).where(eq(authUsers.id, firstId));
    messages = [];
    const second = await register();
    const secondId = second.response.json<{ user: { id: string } }>().user.id;
    const result = await app.inject({ method: 'GET', url: oldLink });
    expect(result.statusCode).toBe(302);
    expect(result.headers.location).toContain('error=INVALID_TOKEN');
    expect(
      (await db.query.authUsers.findFirst({ where: eq(authUsers.id, secondId) }))?.emailVerified,
    ).toBe(false);
  });

  it('condiciona atomicamente o update de confirmação ao ID do token', async () => {
    const first = await register();
    const firstId = first.response.json<{ user: { id: string } }>().user.id;
    const second = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: {
        name: 'Outra',
        email: 'outra@example.com',
        password: 'senha-segura-123',
        role: 'trainer',
      },
    });
    const secondId = second.json<{ user: { id: string } }>().user.id;
    const adapter = createDrizzleAuthAdapter(
      db,
      () => firstId,
    )({ secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL });
    await expect(
      adapter.update({
        model: 'user',
        where: [{ field: 'email', value: 'outra@example.com' }],
        update: { emailVerified: true },
      }),
    ).rejects.toThrow();
    expect(
      (await db.query.authUsers.findFirst({ where: eq(authUsers.id, secondId) }))?.emailVerified,
    ).toBe(false);
  });

  it('não altera identidade se o perfil foi removido antes da confirmação da troca', async () => {
    const { response, cookie } = await register();
    const authUserId = response.json<{ user: { id: string } }>().user.id;
    await app.inject({ method: 'GET', url: deliveredPath() });
    messages = [];
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/trainers/me',
          headers: { cookie },
          payload: { email: 'novo@example.com' },
        })
      ).statusCode,
    ).toBe(200);
    const path = deliveredPath();
    await db.delete(trainers).where(eq(trainers.authUserId, authUserId));
    expect(
      (await app.inject({ method: 'GET', url: path, headers: { cookie } })).statusCode,
    ).toBeGreaterThanOrEqual(400);
    expect(
      (await db.query.authUsers.findFirst({ where: eq(authUsers.id, authUserId) }))?.email,
    ).toBe('ana@example.com');
  });

  it('avança updatedAt do perfil ao confirmar troca mesmo quando está no futuro', async () => {
    const { response, cookie } = await register();
    const authUserId = response.json<{ user: { id: string } }>().user.id;
    await app.inject({ method: 'GET', url: deliveredPath() });
    messages = [];
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/trainers/me',
          headers: { cookie },
          payload: { email: 'novo@example.com' },
        })
      ).statusCode,
    ).toBe(200);
    const path = deliveredPath();
    const future = new Date(Date.now() + 60_000);
    await db.update(trainers).set({ updatedAt: future }).where(eq(trainers.authUserId, authUserId));
    expect((await app.inject({ method: 'GET', url: path, headers: { cookie } })).statusCode).toBe(
      302,
    );
    const profile = await db.query.trainers.findFirst({
      where: eq(trainers.authUserId, authUserId),
    });
    expect(profile?.updatedAt.getTime()).toBeGreaterThan(future.getTime());
  });

  it('permite acesso de aluno independente após confirmar seu próprio email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: {
        name: 'Aluno',
        email: 'aluno@example.com',
        password: 'senha-segura-123',
        role: 'student',
        callbackURL: 'muvit://verify-email',
      },
    });
    const cookie = cookieHeaderFromSetCookie(response.headers['set-cookie']);
    expect(response.statusCode).toBe(200);
    expect(
      (await app.inject({ method: 'GET', url: '/verification-protected', headers: { cookie } }))
        .statusCode,
    ).toBe(403);
    const verify = await app.inject({ method: 'GET', url: deliveredPath() });
    expect(verify.statusCode).toBe(302);
    expect(verify.headers.location).toBe('muvit://verify-email');
    expect(
      (await app.inject({ method: 'GET', url: '/verification-protected', headers: { cookie } }))
        .statusCode,
    ).toBe(200);
  });
});
