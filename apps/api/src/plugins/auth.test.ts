import { db } from '@muvit/db';
import { authSessions, students, trainers } from '@muvit/db/schema';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance | undefined;

beforeEach(async () => {
  await truncateAll();
  app = await buildTestApp();
  app.get('/protected', { preHandler: [app.requireAuth] }, async () => ({ ok: true }));
  app.get('/me', { preHandler: [app.requireAuth] }, async (request) => request.identity);
  app.get(
    '/trainer-only',
    { preHandler: [app.requireAuth, app.requireRole('trainer')] },
    async () => ({ ok: true }),
  );
});

afterEach(async () => {
  await app?.close();
});

afterAll(async () => {
  await closeDb();
});

function currentApp(): FastifyInstance {
  if (app === undefined) throw new Error('Aplicação de teste não inicializada');
  return app;
}

async function createSession(role: 'trainer' | 'student', email: string) {
  const result = await signUpWithSession(currentApp(), {
    name: role === 'trainer' ? 'Treinadora Teste' : 'Aluno Teste',
    email,
    password: 'senha-segura-123',
    role,
  });

  expect(result.response.statusCode).toBe(200);
  return {
    authUserId: result.response.json<{ user: { id: string } }>().user.id,
    cookie: result.cookie,
  };
}

describe('auth plugin', () => {
  it('rejeita requisições sem cookie com 401', async () => {
    const response = await currentApp().inject({ method: 'GET', url: '/protected' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('rejeita cookie inválido com 401', async () => {
    const response = await currentApp().inject({
      method: 'GET',
      url: '/protected',
      headers: { cookie: 'muvit.session_token=sessao-invalida' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('rejeita sessão revogada com 401', async () => {
    const { cookie } = await createSession('trainer', 'revogada@example.com');
    await db.delete(authSessions);

    const response = await currentApp().inject({
      method: 'GET',
      url: '/protected',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('resolve a sessão trainer para a identidade de aplicação', async () => {
    const { authUserId, cookie } = await createSession('trainer', 'trainer-identity@example.com');
    const [profile] = await db
      .select({ id: trainers.id })
      .from(trainers)
      .where(eq(trainers.authUserId, authUserId));

    const response = await currentApp().inject({ method: 'GET', url: '/me', headers: { cookie } });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ authUserId, profileId: profile?.id, role: 'trainer' });
  });

  it('resolve a sessão student para o perfil independente', async () => {
    const { authUserId, cookie } = await createSession('student', 'student-identity@example.com');
    const [profile] = await db
      .select({ id: students.id, isIndependent: students.isIndependent })
      .from(students)
      .where(eq(students.authUserId, authUserId));

    const response = await currentApp().inject({ method: 'GET', url: '/me', headers: { cookie } });

    expect(profile?.isIndependent).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ authUserId, profileId: profile?.id, role: 'student' });
  });

  it('rejeita papel incorreto com 403', async () => {
    const { cookie } = await createSession('student', 'wrong-role@example.com');

    const response = await currentApp().inject({
      method: 'GET',
      url: '/trainer-only',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'forbidden' });
  });

  it('rejeita sessão válida sem perfil sem expor dados sensíveis', async () => {
    const { authUserId, cookie } = await createSession('trainer', 'missing-profile@example.com');
    await db.delete(trainers).where(eq(trainers.authUserId, authUserId));

    const response = await currentApp().inject({ method: 'GET', url: '/me', headers: { cookie } });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
    expect(response.body).not.toContain(authUserId);
    expect(response.body).not.toContain(cookie);
  });
});
