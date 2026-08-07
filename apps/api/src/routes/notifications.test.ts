import { db, queryClient, schema } from '@muvit/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;

async function installPreferencesRaceDelay() {
  await queryClient.unsafe(`
    CREATE OR REPLACE FUNCTION delay_notification_preferences_race_for_test()
    RETURNS trigger AS $$
    BEGIN
      PERFORM pg_sleep(0.25);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await queryClient.unsafe(
    'DROP TRIGGER IF EXISTS delay_notification_preferences_race_for_test ON trainer_notification_preferences',
  );
  await queryClient.unsafe(`
    CREATE TRIGGER delay_notification_preferences_race_for_test
    BEFORE INSERT OR UPDATE ON trainer_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION delay_notification_preferences_race_for_test()
  `);
}

async function removePreferencesRaceDelay() {
  await queryClient.unsafe(
    'DROP TRIGGER IF EXISTS delay_notification_preferences_race_for_test ON trainer_notification_preferences',
  );
  await queryClient.unsafe(
    'DROP FUNCTION IF EXISTS delay_notification_preferences_race_for_test()',
  );
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

  it('preserva duas atualizações parciais concorrentes do mesmo treinador', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Treinador Concorrente',
      email: 'notification-race@example.com',
      password: '12345678',
      role: 'trainer',
    });
    await installPreferencesRaceDelay();

    try {
      const [inactivityResponse, assessmentResponse] = await Promise.all([
        app.inject({
          method: 'PATCH',
          url: '/trainers/me/notification-preferences',
          headers: { cookie: trainer.cookie },
          payload: { inactivity: { afterDays: 21 } },
        }),
        app.inject({
          method: 'PATCH',
          url: '/trainers/me/notification-preferences',
          headers: { cookie: trainer.cookie },
          payload: { pendingAssessment: { staleAfterDays: 30 } },
        }),
      ]);

      expect(inactivityResponse.statusCode).toBe(200);
      expect(assessmentResponse.statusCode).toBe(200);
      const persisted = await app.inject({
        method: 'GET',
        url: '/trainers/me/notification-preferences',
        headers: { cookie: trainer.cookie },
      });
      expect(persisted.json()).toMatchObject({
        inactivity: { afterDays: 21 },
        pendingAssessment: { staleAfterDays: 30 },
      });
    } finally {
      await removePreferencesRaceDelay();
    }
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
