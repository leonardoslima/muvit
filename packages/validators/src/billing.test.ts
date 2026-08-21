import { describe, expect, it } from 'vitest';
import {
  billingInvoiceSchema,
  trainerSubscriptionSchema,
  updateTrainerSubscriptionSchema,
} from './billing.js';

describe('contratos de cobrança', () => {
  it('exige valores monetários positivos em centavos', () => {
    expect(
      billingInvoiceSchema.safeParse({
        id: '10000000-0000-4000-8000-000000000001',
        trainerId: '20000000-0000-4000-8000-000000000001',
        plan: 'starter',
        billingInterval: 'monthly',
        amountCents: 0,
        currency: 'BRL',
        status: 'issued',
        issuedAt: '2026-08-07T12:00:00.000Z',
        paidAt: null,
        createdAt: '2026-08-07T12:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('exige plano e periodicidade ao atualizar a assinatura', () => {
    expect(updateTrainerSubscriptionSchema.safeParse({ plan: 'pro' }).success).toBe(false);
    expect(
      updateTrainerSubscriptionSchema.parse({ plan: 'pro', billingInterval: 'annual' }),
    ).toEqual({
      plan: 'pro',
      billingInterval: 'annual',
    });
  });

  it('aceita assinatura ativa com renovação opcional', () => {
    expect(
      trainerSubscriptionSchema.parse({
        plan: 'pro',
        billingInterval: 'annual',
        status: 'active',
        startsAt: '2026-08-07T12:00:00.000Z',
        renewsAt: null,
      }),
    ).toMatchObject({ plan: 'pro', renewsAt: null });
  });
});
