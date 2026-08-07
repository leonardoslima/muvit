import { db, schema } from '@muvit/db';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDb, truncateAll } from '../../test/helpers/db.js';
import { runDailyNotifications } from './notifications.js';

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeDb();
});

describe('runDailyNotifications', () => {
  it('sends push to inactive students and emails trainers for stale assessments', async () => {
    const [authUser] = await db
      .insert(schema.authUsers)
      .values({
        name: 'Trainer',
        email: 'trainer@example.com',
        emailVerified: true,
        role: 'trainer',
      })
      .returning();
    if (!authUser) throw new Error('auth user not inserted');
    const [trainer] = await db
      .insert(schema.trainers)
      .values({ authUserId: authUser.id, name: authUser.name, email: authUser.email })
      .returning();
    if (!trainer) throw new Error('trainer not inserted');
    await db.insert(schema.trainerNotificationPreferences).values({
      trainerId: trainer.id,
      pendingAssessmentChannel: 'email',
    });

    const [student] = await db
      .insert(schema.students)
      .values({
        name: 'Aluno',
        email: 'student@example.com',
        trainerId: trainer.id,
        expoPushToken: 'ExponentPushToken[inactive]',
      })
      .returning();
    if (!student) throw new Error('student not inserted');

    const sendPush = vi.fn();
    const sendEmail = vi.fn();

    await runDailyNotifications({
      now: new Date('2026-05-19T12:00:00.000Z'),
      sendPush,
      sendEmail,
    });

    expect(sendPush).toHaveBeenCalledWith({
      token: 'ExponentPushToken[inactive]',
      title: 'Hora de voltar ao treino',
      body: 'Voce esta ha 7 dias sem registrar treino.',
    });
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'trainer@example.com',
      subject: 'Aluno com avaliacao vencida',
      html: expect.stringContaining('Aluno'),
    });
  });
});
