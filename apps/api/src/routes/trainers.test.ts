import { db, queryClient, schema } from '@muvit/db';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;

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

  it('atualiza o perfil e mantém a identidade Better Auth sincronizada', async () => {
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
    expect(response.headers['set-cookie']).toHaveLength(2);
    expect(response.json()).toMatchObject({
      id: trainer.profileId,
      name: 'Treinadora Depois',
      email: 'trainer-profile-after@example.com',
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
      email: 'trainer-profile-after@example.com',
      name: 'Treinadora Depois',
      image: 'https://cdn.example.com/avatar.png',
    });
    expect(persistedTrainer).toMatchObject({
      email: authUser?.email,
      name: authUser?.name,
      avatarUrl: authUser?.image,
    });
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
      expect(response.headers['set-cookie']).toHaveLength(4);

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

  it('retorna conflito sem dessincronizar ao tentar usar e-mail existente', async () => {
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

    expect(response.statusCode).toBe(409);
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
