import { db, queryClient, schema } from '@muvit/db';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';
import { DrizzleBillingRepository } from '../modules/billing/repositories/drizzle-billing-repository.js';

let app: FastifyInstance;

async function signupTrainer(email: string) {
  return signUpWithSession(app, {
    name: 'Treinador Cobrança',
    email,
    password: '12345678',
    role: 'trainer',
  });
}

async function installPlanRaceDelays() {
  await queryClient.unsafe(`
    CREATE OR REPLACE FUNCTION delay_plan_race_for_test()
    RETURNS trigger AS $$
    BEGIN
      PERFORM pg_sleep(0.25);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await queryClient.unsafe('DROP TRIGGER IF EXISTS delay_plan_race_student_for_test ON students');
  await queryClient.unsafe(
    'DROP TRIGGER IF EXISTS delay_plan_race_subscription_for_test ON trainer_subscriptions',
  );
  await queryClient.unsafe(`
    CREATE TRIGGER delay_plan_race_student_for_test
    BEFORE INSERT ON students
    FOR EACH ROW
    WHEN (NEW.name = 'Concorrente downgrade')
    EXECUTE FUNCTION delay_plan_race_for_test()
  `);
  await queryClient.unsafe(`
    CREATE TRIGGER delay_plan_race_subscription_for_test
    BEFORE INSERT OR UPDATE ON trainer_subscriptions
    FOR EACH ROW
    WHEN (NEW.plan = 'starter')
    EXECUTE FUNCTION delay_plan_race_for_test()
  `);
}

async function removePlanRaceDelays() {
  await queryClient.unsafe('DROP TRIGGER IF EXISTS delay_plan_race_student_for_test ON students');
  await queryClient.unsafe(
    'DROP TRIGGER IF EXISTS delay_plan_race_subscription_for_test ON trainer_subscriptions',
  );
  await queryClient.unsafe('DROP FUNCTION IF EXISTS delay_plan_race_for_test()');
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

describe('billing', () => {
  it('retorna catálogo, assinatura free inicial, uso e faturas do treinador', async () => {
    const trainer = await signupTrainer('billing-overview@example.com');

    const response = await app.inject({
      method: 'GET',
      url: '/trainers/me/subscription',
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      catalog: {
        free: { activeStudentLimit: 3, monthlyPriceCents: 0, annualPriceCents: 0 },
        pro: { activeStudentLimit: 50, monthlyPriceCents: 9990, annualPriceCents: 95880 },
        team: { activeStudentLimit: null },
      },
      subscription: { plan: 'free', billingInterval: 'monthly', status: 'active' },
      usage: { activeStudents: 0, activeStudentLimit: 3 },
      invoices: [],
    });
  });

  it('troca assinatura imediatamente e cria uma fatura issued', async () => {
    const trainer = await signupTrainer('billing-change@example.com');

    const response = await app.inject({
      method: 'PATCH',
      url: '/trainers/me/subscription',
      headers: { cookie: trainer.cookie },
      payload: { plan: 'pro', billingInterval: 'annual' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      subscription: { plan: 'pro', billingInterval: 'annual', status: 'active' },
      invoice: { plan: 'pro', billingInterval: 'annual', amountCents: 95880, status: 'issued' },
    });
    const persistedTrainer = await db.query.trainers.findFirst({
      where: eq(schema.trainers.id, trainer.profileId),
    });
    expect(persistedTrainer?.plan).toBe('pro');
  });

  it('mantém vigência e fatura no retry sequencial do mesmo plano', async () => {
    const trainer = await signupTrainer('billing-sequential-retry@example.com');
    const repository = new DrizzleBillingRepository();

    const first = await repository.changeSubscription(
      trainer.profileId,
      { plan: 'pro', billingInterval: 'annual' },
      95880,
      new Date('2026-08-07T12:00:00.000Z'),
    );
    const retry = await repository.changeSubscription(
      trainer.profileId,
      { plan: 'pro', billingInterval: 'annual' },
      95880,
      new Date('2026-08-08T12:00:00.000Z'),
    );

    const [subscriptions, invoices] = await Promise.all([
      db.query.trainerSubscriptions.findMany({
        where: eq(schema.trainerSubscriptions.trainerId, trainer.profileId),
      }),
      db.query.billingInvoices.findMany({
        where: eq(schema.billingInvoices.trainerId, trainer.profileId),
      }),
    ]);
    expect(retry).toMatchObject({
      subscription: {
        startsAt: first.subscription.startsAt,
        renewsAt: first.subscription.renewsAt,
      },
      invoice: null,
    });
    expect(subscriptions).toHaveLength(1);
    expect(invoices).toHaveLength(1);
  });

  it('serializa retries concorrentes e persiste uma única assinatura e fatura', async () => {
    const trainer = await signupTrainer('billing-concurrent-retry@example.com');

    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        app.inject({
          method: 'PATCH',
          url: '/trainers/me/subscription',
          headers: { cookie: trainer.cookie },
          payload: { plan: 'pro', billingInterval: 'monthly' },
        }),
      ),
    );

    expect(responses.map((response) => response.statusCode)).toEqual([200, 200]);
    expect(responses.map((response) => response.json().invoice === null).sort()).toEqual([
      false,
      true,
    ]);
    const [subscriptions, invoices] = await Promise.all([
      db.query.trainerSubscriptions.findMany({
        where: eq(schema.trainerSubscriptions.trainerId, trainer.profileId),
      }),
      db.query.billingInvoices.findMany({
        where: eq(schema.billingInvoices.trainerId, trainer.profileId),
      }),
    ]);
    expect(subscriptions).toHaveLength(1);
    expect(invoices).toHaveLength(1);
  });

  it.each([
    ['mensal', 'monthly' as const, '2025-01-31T15:45:30.123Z', '2025-02-28T15:45:30.123Z'],
    ['anual', 'annual' as const, '2024-02-29T15:45:30.123Z', '2025-02-28T15:45:30.123Z'],
  ])(
    'limita a renovação %s ao último dia civil UTC do destino',
    async (_, interval, now, expected) => {
      const trainer = await signupTrainer(`billing-clamp-${interval}@example.com`);
      const repository = new DrizzleBillingRepository();

      const result = await repository.changeSubscription(
        trainer.profileId,
        { plan: 'pro', billingInterval: interval },
        interval === 'monthly' ? 9990 : 95880,
        new Date(now),
      );

      expect(result.subscription.renewsAt).toBe(expected);
    },
  );

  it('rejeita plano inválido na borda HTTP', async () => {
    const trainer = await signupTrainer('billing-invalid@example.com');

    const response = await app.inject({
      method: 'PATCH',
      url: '/trainers/me/subscription',
      headers: { cookie: trainer.cookie },
      payload: { plan: 'enterprise', billingInterval: 'monthly' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('bloqueia downgrade abaixo do uso atual', async () => {
    const trainer = await signupTrainer('billing-downgrade@example.com');
    await db.insert(schema.students).values(
      Array.from({ length: 16 }, (_, index) => ({
        trainerId: trainer.profileId,
        isIndependent: false,
        name: `Aluno ${index + 1}`,
        status: 'active' as const,
      })),
    );

    const response = await app.inject({
      method: 'PATCH',
      url: '/trainers/me/subscription',
      headers: { cookie: trainer.cookie },
      payload: { plan: 'starter', billingInterval: 'monthly' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'O plano selecionado aceita até 15 alunos ativos.' });
    expect(await db.query.billingInvoices.findMany()).toHaveLength(0);
  });

  it('serializa downgrade concorrente com ativação sem produzir plano acima do limite', async () => {
    const trainer = await signupTrainer('billing-race@example.com');
    await db
      .update(schema.trainers)
      .set({ plan: 'pro' })
      .where(eq(schema.trainers.id, trainer.profileId));
    await db.insert(schema.students).values(
      Array.from({ length: 15 }, (_, index) => ({
        trainerId: trainer.profileId,
        isIndependent: false,
        name: `Aluno existente ${index + 1}`,
        status: 'active' as const,
      })),
    );
    await installPlanRaceDelays();

    try {
      const [downgrade, activation] = await Promise.all([
        app.inject({
          method: 'PATCH',
          url: '/trainers/me/subscription',
          headers: { cookie: trainer.cookie },
          payload: { plan: 'starter', billingInterval: 'monthly' },
        }),
        app.inject({
          method: 'POST',
          url: '/students',
          headers: { cookie: trainer.cookie },
          payload: { name: 'Concorrente downgrade' },
        }),
      ]);

      expect([downgrade.statusCode, activation.statusCode]).toContain(409);
      expect([200, 201]).toContain(
        [downgrade.statusCode, activation.statusCode].find((status) => status !== 409),
      );

      const [persistedTrainer, activeStudents] = await Promise.all([
        db.query.trainers.findFirst({ where: eq(schema.trainers.id, trainer.profileId) }),
        db.query.students.findMany({ where: eq(schema.students.trainerId, trainer.profileId) }),
      ]);
      const activeStudentCount = activeStudents.filter(
        (student) => student.status === 'active',
      ).length;
      expect(persistedTrainer?.plan === 'starter' && activeStudentCount > 15).toBe(false);
    } finally {
      await removePlanRaceDelays();
    }
  });

  it('retorna somente a fatura pertencente ao treinador autenticado', async () => {
    const owner = await signupTrainer('billing-owner@example.com');
    const other = await signupTrainer('billing-other@example.com');
    const [invoice] = await db
      .insert(schema.billingInvoices)
      .values({
        trainerId: owner.profileId,
        plan: 'pro',
        billingInterval: 'monthly',
        amountCents: 9990,
        status: 'issued',
        issuedAt: new Date('2026-08-07T12:00:00.000Z'),
      })
      .returning();
    if (invoice === undefined) throw new Error('fixture de fatura não foi criada');

    const ownerResponse = await app.inject({
      method: 'GET',
      url: `/trainers/me/invoices/${invoice.id}`,
      headers: { cookie: owner.cookie },
    });
    const otherResponse = await app.inject({
      method: 'GET',
      url: `/trainers/me/invoices/${invoice.id}`,
      headers: { cookie: other.cookie },
    });

    expect(ownerResponse.statusCode).toBe(200);
    expect(ownerResponse.json()).toMatchObject({ id: invoice.id, trainerId: owner.profileId });
    expect(otherResponse.statusCode).toBe(404);
  });

  it('rejeita acesso sem sessão e por aluno autenticado', async () => {
    const student = await signUpWithSession(app, {
      name: 'Aluno sem cobrança',
      email: 'billing-student@example.com',
      password: '12345678',
      role: 'student',
    });

    const unauthorized = await app.inject({ method: 'GET', url: '/trainers/me/subscription' });
    const forbidden = await app.inject({
      method: 'GET',
      url: '/trainers/me/subscription',
      headers: { cookie: student.cookie },
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(forbidden.statusCode).toBe(403);
  });
});
