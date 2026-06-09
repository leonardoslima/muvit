import { db, schema } from '@muvit/db';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDb, truncateAll } from '../../test/helpers/db.js';
import { hashPassword } from '../lib/passwords.js';
import { runDailyNotifications } from './notifications.js';

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeDb();
});

describe('runDailyNotifications', () => {
  it('sends push to inactive students and emails trainers for stale assessments', async () => {
    const passwordHash = await hashPassword('12345678');
    const [trainer] = await db
      .insert(schema.trainers)
      .values({ name: 'Trainer', email: 'trainer@example.com', passwordHash })
      .returning();
    if (!trainer) throw new Error('trainer not inserted');

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
