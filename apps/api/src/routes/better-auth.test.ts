import { db } from '@muvit/db';
import { authAccounts, authSessions, authUsers, students, trainers } from '@muvit/db/schema';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cookieHeaderFromSetCookie, signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

type TestProfileProvisioner = {
  provision(input: {
    authUserId: string;
    name: string;
    email: string;
    role: 'trainer' | 'student';
  }): Promise<void>;
  removeIdentity(authUserId: string): Promise<void>;
};

let app: FastifyInstance | undefined;

beforeEach(async () => {
  await truncateAll();
  app = await buildTestApp();
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

describe('Better Auth', () => {
  it('cadastra treinador, cria perfil vinculado e devolve cookie de sessão', async () => {
    const { response, cookie } = await signUpWithSession(currentApp(), {
      name: 'Ana Lima',
      email: 'ana@example.com',
      password: 'senha-segura-123',
      role: 'trainer',
    });

    expect(response.statusCode).toBe(200);
    expect(cookie).not.toBe('');

    const body = response.json<{ user: { id: string; email: string; role: string } }>();
    const profiles = await db.select().from(trainers).where(eq(trainers.authUserId, body.user.id));

    expect(body.user).toMatchObject({ email: 'ana@example.com', role: 'trainer' });
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      authUserId: body.user.id,
      email: 'ana@example.com',
      name: 'Ana Lima',
    });
  });

  it('cadastra aluno independente e cria somente o perfil de aluno', async () => {
    const { response } = await signUpWithSession(currentApp(), {
      name: 'Léo Souza',
      email: 'leo@example.com',
      password: 'senha-segura-123',
      role: 'student',
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{ user: { id: string; role: string } }>();
    const studentProfiles = await db
      .select()
      .from(students)
      .where(eq(students.authUserId, body.user.id));
    const trainerProfiles = await db
      .select()
      .from(trainers)
      .where(eq(trainers.authUserId, body.user.id));

    expect(body.user.role).toBe('student');
    expect(studentProfiles).toHaveLength(1);
    expect(studentProfiles[0]).toMatchObject({
      authUserId: body.user.id,
      email: 'leo@example.com',
      name: 'Léo Souza',
      isIndependent: true,
      trainerId: null,
    });
    expect(trainerProfiles).toHaveLength(0);
  });

  it('rejeita o mesmo e-mail quando solicitado com outro papel', async () => {
    await signUpWithSession(currentApp(), {
      name: 'Ana Lima',
      email: 'papel@example.com',
      password: 'senha-segura-123',
      role: 'trainer',
    });

    const { response } = await signUpWithSession(currentApp(), {
      name: 'Ana Lima',
      email: 'papel@example.com',
      password: 'senha-segura-123',
      role: 'student',
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(await db.select().from(authUsers)).toHaveLength(1);
    expect(await db.select().from(trainers)).toHaveLength(1);
    expect(await db.select().from(students)).toHaveLength(0);
  });

  it.each([
    ['ausente', undefined],
    ['inválido', 'admin'],
  ])('rejeita papel %s no cadastro', async (label, role) => {
    const response = await currentApp().inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: {
        name: 'Pessoa Inválida',
        email: `${label}@example.com`,
        password: 'senha-segura-123',
        ...(role === undefined ? {} : { role }),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(await db.select().from(authUsers)).toHaveLength(0);
  });

  it('não permite alterar o papel depois do cadastro', async () => {
    const { response: signUpResponse, cookie } = await signUpWithSession(currentApp(), {
      name: 'Ana Lima',
      email: 'imutavel@example.com',
      password: 'senha-segura-123',
      role: 'trainer',
    });
    const user = signUpResponse.json<{ user: { id: string } }>().user;

    const response = await currentApp().inject({
      method: 'POST',
      url: '/api/auth/update-user',
      headers: { cookie },
      payload: { role: 'student' },
    });

    const identities = await db.select().from(authUsers).where(eq(authUsers.id, user.id));
    expect(response.statusCode).toBe(400);
    expect(identities[0]?.role).toBe('trainer');
  });

  it('compensa a identidade quando o provisionamento de perfil falha', async () => {
    await app?.close();
    const failingProvisioner: TestProfileProvisioner = {
      async provision() {
        throw new Error('falha injetada');
      },
      async removeIdentity(authUserId: string) {
        await db.delete(authUsers).where(eq(authUsers.id, authUserId));
      },
    };
    app = await buildTestApp({ profileProvisioner: failingProvisioner });

    const { response } = await signUpWithSession(currentApp(), {
      name: 'Falha Controlada',
      email: 'falha@example.com',
      password: 'senha-segura-123',
      role: 'trainer',
    });

    expect(response.statusCode).toBe(500);
    expect(await db.select().from(authUsers)).toHaveLength(0);
    expect(await db.select().from(authAccounts)).toHaveLength(0);
    expect(await db.select().from(authSessions)).toHaveLength(0);
    expect(await db.select().from(trainers)).toHaveLength(0);
    expect(await db.select().from(students)).toHaveLength(0);
  });

  it('recupera a sessão pelo cookie e encerra a sessão', async () => {
    const { cookie } = await signUpWithSession(currentApp(), {
      name: 'Ana Lima',
      email: 'sessao@example.com',
      password: 'senha-segura-123',
      role: 'trainer',
    });

    const sessionResponse = await currentApp().inject({
      method: 'GET',
      url: '/api/auth/get-session',
      headers: { cookie },
    });
    expect(sessionResponse.statusCode).toBe(200);
    expect(sessionResponse.json()).toMatchObject({
      user: { email: 'sessao@example.com', role: 'trainer' },
    });

    const signOutResponse = await currentApp().inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: { cookie },
    });

    expect(signOutResponse.statusCode).toBe(200);
    expect(cookieHeaderFromSetCookie(signOutResponse.headers['set-cookie'])).not.toBe('');
    expect(await db.select().from(authSessions)).toHaveLength(0);

    const expiredSessionResponse = await currentApp().inject({
      method: 'GET',
      url: '/api/auth/get-session',
      headers: { cookie },
    });
    expect(expiredSessionResponse.statusCode).toBe(200);
    expect(expiredSessionResponse.json()).toBeNull();
  });
});
