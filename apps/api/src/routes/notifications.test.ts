import { db, schema } from '@muvit/db';
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

describe('preferências de notificação', () => {
  it('retorna defaults efetivos sem criar uma linha persistida', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Treinador Notificações',
      email: 'notification-defaults@example.com',
      password: '12345678',
      role: 'trainer',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/trainers/me/notification-preferences',
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      inactivity: { enabled: true, afterDays: 7, channel: 'both' },
      pendingAssessment: { enabled: true, staleAfterDays: 60, channel: 'push' },
    });
    expect(await db.query.trainerNotificationPreferences.findMany()).toHaveLength(0);
  });

  it('persiste atualização parcial com upsert idempotente por treinador', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Treinador Preferências',
      email: 'notification-update@example.com',
      password: '12345678',
      role: 'trainer',
    });
    const request = {
      method: 'PATCH' as const,
      url: '/trainers/me/notification-preferences',
      headers: { cookie: trainer.cookie },
      payload: { inactivity: { afterDays: 21, channel: 'email' as const } },
    };

    const first = await app.inject(request);
    const second = await app.inject(request);

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      inactivity: { enabled: true, afterDays: 21, channel: 'email' },
    });
    expect(second.statusCode).toBe(200);
    expect(await db.select().from(schema.trainerNotificationPreferences)).toHaveLength(1);
  });

  it('rejeita payload vazio na borda HTTP', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Treinador Payload',
      email: 'notification-invalid@example.com',
      password: '12345678',
      role: 'trainer',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/trainers/me/notification-preferences',
      headers: { cookie: trainer.cookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejeita acesso sem sessão e por aluno autenticado', async () => {
    const student = await signUpWithSession(app, {
      name: 'Aluno sem Preferências',
      email: 'notification-student@example.com',
      password: '12345678',
      role: 'student',
    });

    const unauthorized = await app.inject({
      method: 'GET',
      url: '/trainers/me/notification-preferences',
    });
    const forbidden = await app.inject({
      method: 'GET',
      url: '/trainers/me/notification-preferences',
      headers: { cookie: student.cookie },
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(forbidden.statusCode).toBe(403);
  });
});
