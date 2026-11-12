import { db, queryClient, schema } from '@muvit/db';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;

type SetCookieHeaders = string | string[] | undefined;

function setCookieList(setCookie: SetCookieHeaders): string[] {
  if (setCookie === undefined) return [];
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

/** Aplica os Set-Cookie da resposta como um navegador faria, sem reaproveitar o cookie antigo cegamente. */
function applySetCookieJar(current: string, setCookie: SetCookieHeaders): string {
  const jar = new Map<string, string>();
  for (const pair of current.split(';')) {
    const trimmed = pair.trim();
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    jar.set(trimmed.slice(0, separator), trimmed.slice(separator + 1));
  }
  for (const header of setCookieList(setCookie)) {
    const [pair, ...attributes] = header.split(';').map((part) => part.trim());
    if (!pair) continue;
    const separator = pair.indexOf('=');
    if (separator < 1) continue;
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    const expired = attributes.some((attribute) => /^max-age=0$/i.test(attribute));
    if (value === '' || expired) jar.delete(name);
    else jar.set(name, value);
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

beforeEach(async () => {
  app = await buildTestApp();
  await truncateAll();
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  await closeDb();
});

describe('trainers', () => {
  it('retorna o perfil do treinador autenticado', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Treinadora Perfil',
      email: 'trainer-profile-read@example.com',
      password: '12345678',
      role: 'trainer',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/trainers/me',
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: trainer.profileId,
      name: 'Treinadora Perfil',
      email: 'trainer-profile-read@example.com',
      phone: null,
      bio: null,
      specialties: [],
      avatarUrl: null,
      plan: 'free',
      onboardedAt: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('atualiza o perfil e mantém o email anterior até confirmação', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Treinadora Antes',
      email: 'trainer-profile-before@example.com',
      password: '12345678',
      role: 'trainer',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/trainers/me',
      headers: { cookie: trainer.cookie },
      payload: {
        name: 'Treinadora Depois',
        email: 'Trainer-Profile-After@Example.com',
        avatarUrl: 'https://cdn.example.com/avatar.png',
        phone: '+55 11 99999-0000',
        bio: 'Especialista em treinamento funcional.',
        specialties: ['Funcional', 'Mobilidade'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['set-cookie']).toEqual(expect.any(Array));
    expect(response.headers['set-cookie']).toHaveLength(1);
    expect(response.json()).toMatchObject({
      id: trainer.profileId,
      name: 'Treinadora Depois',
      email: 'trainer-profile-before@example.com',
      avatarUrl: 'https://cdn.example.com/avatar.png',
      phone: '+55 11 99999-0000',
      bio: 'Especialista em treinamento funcional.',
      specialties: ['Funcional', 'Mobilidade'],
    });

    const [authUser, persistedTrainer] = await Promise.all([
      db.query.authUsers.findFirst({ where: eq(schema.authUsers.id, trainer.authUserId) }),
      db.query.trainers.findFirst({ where: eq(schema.trainers.id, trainer.profileId) }),
    ]);
    expect(authUser).toMatchObject({
      email: 'trainer-profile-before@example.com',
      name: 'Treinadora Depois',
      image: 'https://cdn.example.com/avatar.png',
    });
    expect(persistedTrainer).toMatchObject({
      email: authUser?.email,
      name: authUser?.name,
      avatarUrl: authUser?.image,
    });
  });

  it('mantém sessão e persiste nome após atualização isolada', async () => {
    const email = 'trainer-name-only@example.com';
    const password = '12345678';
    const trainer = await signUpWithSession(app, {
      name: 'Treinadora Antes',
      email,
      password,
      role: 'trainer',
    });

    const patch = await app.inject({
      method: 'PATCH',
      url: '/trainers/me',
      headers: { cookie: trainer.cookie },
      payload: { name: 'Treinadora Somente Nome' },
    });

    expect(patch.statusCode).toBe(200);
    const renewal = setCookieList(patch.headers['set-cookie']).filter((header) =>
      header.startsWith('muvit.session_token='),
    );
    expect(renewal).toHaveLength(1);
    expect(renewal[0]).toMatch(/HttpOnly/i);
    expect(renewal[0]).toMatch(/SameSite=Lax/i);
    expect(renewal[0]).toMatch(/Max-Age=\d+/i);
    expect(renewal[0]).not.toMatch(/Max-Age=0(?:;|$)/i);
    expect(renewal[0]).not.toMatch(/^muvit\.session_token=;/);

    const effectiveCookie = applySetCookieJar(trainer.cookie, patch.headers['set-cookie']);
    expect(effectiveCookie).toContain('muvit.session_token=');

    const session = await app.inject({
      method: 'GET',
      url: '/api/auth/get-session',
      headers: { cookie: effectiveCookie },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toMatchObject({
      user: {
        id: trainer.authUserId,
        role: 'trainer',
        email,
        emailVerified: true,
        name: 'Treinadora Somente Nome',
      },
    });

    const profile = await app.inject({
      method: 'GET',
      url: '/trainers/me',
      headers: { cookie: effectiveCookie },
    });
    expect(profile.statusCode).toBe(200);
    expect(profile.json()).toMatchObject({
      id: trainer.profileId,
      email,
      name: 'Treinadora Somente Nome',
    });

    const signOut = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: { cookie: effectiveCookie, origin: 'http://localhost:3000' },
    });
    expect(signOut.statusCode).toBe(200);

    const signIn = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email, password },
    });
    expect(signIn.statusCode).toBe(200);
    const reauthenticatedCookie = applySetCookieJar('', signIn.headers['set-cookie']);
    const reauthenticated = await app.inject({
      method: 'GET',
      url: '/api/auth/get-session',
      headers: { cookie: reauthenticatedCookie },
    });
    expect(reauthenticated.json()).toMatchObject({
      user: { id: trainer.authUserId, email, name: 'Treinadora Somente Nome' },
    });
  });

  it('renova sessão elegível ao updateAge sem invalidar o cookie ao salvar o nome', async () => {
    const email = 'trainer-name-renewal@example.com';
    const trainer = await signUpWithSession(app, {
      name: 'Treinadora Renovação',
      email,
      password: '12345678',
      role: 'trainer',
    });
    // Sessão a 10 dias do vencimento: elegível à renovação de updateAge (1 dia), sem esperar tempo real.
    await db.execute(
      sql`UPDATE auth_sessions SET expires_at = now() + interval '10 days' WHERE user_id = ${trainer.authUserId}`,
    );

    const patch = await app.inject({
      method: 'PATCH',
      url: '/trainers/me',
      headers: { cookie: trainer.cookie },
      payload: {
        name: 'Treinadora Renovada',
        email,
        phone: null,
        bio: null,
        specialties: [],
        avatarUrl: null,
      },
    });

    expect(patch.statusCode).toBe(200);
    const effectiveCookie = applySetCookieJar(trainer.cookie, patch.headers['set-cookie']);
    const session = await app.inject({
      method: 'GET',
      url: '/api/auth/get-session',
      headers: { cookie: effectiveCookie },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toMatchObject({
      user: { id: trainer.authUserId, role: 'trainer', email, name: 'Treinadora Renovada' },
    });

    const [persisted] = await db
      .select()
      .from(schema.authSessions)
      .where(eq(schema.authSessions.userId, trainer.authUserId));
    expect(persisted?.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
  });

  it('compensa a identidade quando a persistência do perfil falha', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Treinadora Compensação',
      email: 'trainer-compensation-before@example.com',
      password: '12345678',
      role: 'trainer',
    });

    await queryClient.unsafe(`
      CREATE OR REPLACE FUNCTION fail_trainer_profile_update_for_test()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.bio = 'falha-controlada-de-persistencia' THEN
          RAISE EXCEPTION 'controlled trainer profile update failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryClient.unsafe(
      'DROP TRIGGER IF EXISTS fail_trainer_profile_update_for_test ON trainers',
    );
    await queryClient.unsafe(`
      CREATE TRIGGER fail_trainer_profile_update_for_test
      BEFORE UPDATE ON trainers
      FOR EACH ROW EXECUTE FUNCTION fail_trainer_profile_update_for_test()
    `);

    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/trainers/me',
        headers: { cookie: trainer.cookie },
        payload: {
          name: 'Nome que deve ser desfeito',
          email: 'trainer-compensation-after@example.com',
          bio: 'falha-controlada-de-persistencia',
        },
      });

      expect(response.statusCode).toBe(500);
      expect(response.headers['set-cookie']).toEqual(expect.any(Array));
      expect(response.headers['set-cookie']).toHaveLength(2);

      const [authUser, persistedTrainer] = await Promise.all([
        db.query.authUsers.findFirst({ where: eq(schema.authUsers.id, trainer.authUserId) }),
        db.query.trainers.findFirst({ where: eq(schema.trainers.id, trainer.profileId) }),
      ]);
      expect(authUser).toMatchObject({
        email: 'trainer-compensation-before@example.com',
        name: 'Treinadora Compensação',
        image: null,
      });
      expect(persistedTrainer).toMatchObject({
        email: authUser?.email,
        name: authUser?.name,
        avatarUrl: authUser?.image,
      });
    } finally {
      await queryClient.unsafe(
        'DROP TRIGGER IF EXISTS fail_trainer_profile_update_for_test ON trainers',
      );
      await queryClient.unsafe('DROP FUNCTION IF EXISTS fail_trainer_profile_update_for_test()');
    }
  });

  it('mantém resposta genérica e não dessincroniza ao solicitar e-mail existente', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Treinadora Conflito',
      email: 'trainer-conflict@example.com',
      password: '12345678',
      role: 'trainer',
    });
    await signUpWithSession(app, {
      name: 'Aluno E-mail Existente',
      email: 'existing-student@example.com',
      password: '12345678',
      role: 'student',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/trainers/me',
      headers: { cookie: trainer.cookie },
      payload: { email: 'existing-student@example.com' },
    });

    expect(response.statusCode).toBe(200);
    const [authUser, persistedTrainer] = await Promise.all([
      db.query.authUsers.findFirst({ where: eq(schema.authUsers.id, trainer.authUserId) }),
      db.query.trainers.findFirst({ where: eq(schema.trainers.id, trainer.profileId) }),
    ]);
    expect(authUser?.email).toBe('trainer-conflict@example.com');
    expect(persistedTrainer?.email).toBe(authUser?.email);
  });

  it('rejeita atualização vazia', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Treinadora Validação',
      email: 'trainer-profile-validation@example.com',
      password: '12345678',
      role: 'trainer',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/trainers/me',
      headers: { cookie: trainer.cookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejeita atualização sem sessão', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/trainers/me',
      payload: { name: 'Sem sessão' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejeita atualização por aluno autenticado', async () => {
    const student = await signUpWithSession(app, {
      name: 'Aluno sem acesso ao perfil de treinador',
      email: 'student-trainer-profile@example.com',
      password: '12345678',
      role: 'student',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/trainers/me',
      headers: { cookie: student.cookie },
      payload: { name: 'Tentativa indevida' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('completa o onboarding do perfil do treinador autenticado', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Treinadora',
      email: 'trainer-onboarding@example.com',
      password: '12345678',
      role: 'trainer',
    });
    expect(trainer.profileId).not.toBe(trainer.authUserId);

    const response = await app.inject({
      method: 'POST',
      url: '/trainers/onboarding',
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ onboardedAt: expect.any(String) });

    const persistedTrainer = await db.query.trainers.findFirst({
      where: eq(schema.trainers.id, trainer.profileId),
    });
    expect(persistedTrainer?.onboardedAt?.toISOString()).toBe(response.json().onboardedAt);
  });

  it('rejeita aluno autenticado', async () => {
    const student = await signUpWithSession(app, {
      name: 'Aluno',
      email: 'student-onboarding@example.com',
      password: '12345678',
      role: 'student',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/trainers/onboarding',
      headers: { cookie: student.cookie },
    });

    expect(response.statusCode).toBe(403);
  });

  it('rejeita requisição sem sessão', async () => {
    const response = await app.inject({ method: 'POST', url: '/trainers/onboarding' });

    expect(response.statusCode).toBe(401);
  });
});
