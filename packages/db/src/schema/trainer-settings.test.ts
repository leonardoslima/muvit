import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, schema } from '../index.js';

let authUserId: string;
let trainerId: string;

beforeEach(async () => {
  authUserId = randomUUID();
  const email = `trainer-${authUserId}@muvit.test`;
  await db
    .insert(schema.authUsers)
    .values({ id: authUserId, name: 'Treinador de teste', email, role: 'trainer' });
  const [trainer] = await db
    .insert(schema.trainers)
    .values({ authUserId, name: 'Treinador de teste', email })
    .returning({ id: schema.trainers.id });
  if (!trainer) throw new Error('não foi possível criar o treinador de teste');
  trainerId = trainer.id;
});

afterEach(async () => {
  await db.delete(schema.authUsers).where(eq(schema.authUsers.id, authUserId));
});

describe('persistência de configurações do treinador', () => {
  it('rejeita canal de notificação fora dos valores aprovados', async () => {
    await expect(
      db.insert(schema.trainerNotificationPreferences).values({
        trainerId,
        inactivityChannel: sql`'sms'`,
      }),
    ).rejects.toThrow();
  });

  it('rejeita fatura sem valor positivo em centavos', async () => {
    await expect(
      db.insert(schema.billingInvoices).values({
        trainerId,
        plan: 'starter',
        billingInterval: 'monthly',
        amountCents: 0,
        currency: 'BRL',
        status: 'issued',
        issuedAt: new Date('2026-08-07T12:00:00Z'),
      }),
    ).rejects.toThrow();
  });

  it('permite somente uma assinatura por treinador', async () => {
    await db.insert(schema.trainerSubscriptions).values({
      trainerId,
      plan: 'starter',
      billingInterval: 'monthly',
      status: 'active',
      startsAt: new Date('2026-08-07T12:00:00Z'),
    });

    await expect(
      db.insert(schema.trainerSubscriptions).values({
        trainerId,
        plan: 'pro',
        billingInterval: 'annual',
        status: 'active',
        startsAt: new Date('2026-08-07T12:00:00Z'),
      }),
    ).rejects.toThrow();
  });
});
