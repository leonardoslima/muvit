import { db, schema } from '@muvit/db';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;

async function signupTrainer(email: string) {
  return signUpWithSession(app, {
    name: 'Treinador Cobrança',
    email,
    password: '12345678',
    role: 'trainer',
  });
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
