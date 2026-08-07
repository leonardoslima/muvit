import { db, schema } from '@muvit/db';
import type {
  BillingInvoice,
  TrainerSubscription,
  UpdateTrainerSubscriptionInput,
} from '@muvit/validators';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getTrainerPlanDatabase } from '../../trainer-plan/repositories/drizzle-trainer-plan-mutation-lock.js';
import type {
  BillingOverviewData,
  BillingRepository,
  ChangeSubscriptionResult,
} from './billing-repository.js';

function toSubscription(
  subscription: typeof schema.trainerSubscriptions.$inferSelect,
): TrainerSubscription {
  return {
    plan: subscription.plan,
    billingInterval: subscription.billingInterval,
    status: subscription.status,
    startsAt: subscription.startsAt.toISOString(),
    renewsAt: subscription.renewsAt?.toISOString() ?? null,
  };
}

function toInvoice(invoice: typeof schema.billingInvoices.$inferSelect): BillingInvoice {
  return {
    id: invoice.id,
    trainerId: invoice.trainerId,
    plan: invoice.plan,
    billingInterval: invoice.billingInterval,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    status: invoice.status,
    issuedAt: invoice.issuedAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
  };
}

function renewalDate(now: Date, billingInterval: 'monthly' | 'annual') {
  const renewal = new Date(now);
  if (billingInterval === 'monthly') {
    renewal.setUTCMonth(renewal.getUTCMonth() + 1);
  } else {
    renewal.setUTCFullYear(renewal.getUTCFullYear() + 1);
  }
  return renewal;
}

export class DrizzleBillingRepository implements BillingRepository {
  async getOverview(trainerId: string): Promise<BillingOverviewData | null> {
    const [trainer, subscription, invoices, activeStudentCountResult] = await Promise.all([
      db.query.trainers.findFirst({ where: eq(schema.trainers.id, trainerId) }),
      db.query.trainerSubscriptions.findFirst({
        where: eq(schema.trainerSubscriptions.trainerId, trainerId),
      }),
      db.query.billingInvoices.findMany({
        where: eq(schema.billingInvoices.trainerId, trainerId),
        orderBy: [desc(schema.billingInvoices.issuedAt)],
      }),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.students)
        .where(and(eq(schema.students.trainerId, trainerId), eq(schema.students.status, 'active'))),
    ]);

    if (trainer === undefined) return null;

    return {
      subscription:
        subscription === undefined
          ? {
              plan: trainer.plan,
              billingInterval: 'monthly',
              status: 'active',
              startsAt: trainer.createdAt.toISOString(),
              renewsAt: null,
            }
          : toSubscription(subscription),
      invoices: invoices.map(toInvoice),
      activeStudentCount: activeStudentCountResult[0]?.count ?? 0,
    };
  }

  async countActiveStudents(trainerId: string): Promise<number> {
    const result = await getTrainerPlanDatabase()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.students)
      .where(and(eq(schema.students.trainerId, trainerId), eq(schema.students.status, 'active')));
    return result[0]?.count ?? 0;
  }

  async changeSubscription(
    trainerId: string,
    input: UpdateTrainerSubscriptionInput,
    amountCents: number,
    now: Date,
  ): Promise<ChangeSubscriptionResult> {
    return getTrainerPlanDatabase().transaction(async (transaction) => {
      const renewsAt = input.plan === 'free' ? null : renewalDate(now, input.billingInterval);
      const [subscription] = await transaction
        .insert(schema.trainerSubscriptions)
        .values({
          trainerId,
          ...input,
          status: 'active',
          startsAt: now,
          renewsAt,
        })
        .onConflictDoUpdate({
          target: schema.trainerSubscriptions.trainerId,
          set: { ...input, status: 'active', startsAt: now, renewsAt },
        })
        .returning();
      if (subscription === undefined) throw new Error('Assinatura não pôde ser atualizada');

      await transaction
        .update(schema.trainers)
        .set({ plan: input.plan, updatedAt: now })
        .where(eq(schema.trainers.id, trainerId));

      if (amountCents === 0) {
        return { subscription: toSubscription(subscription), invoice: null };
      }

      const [invoice] = await transaction
        .insert(schema.billingInvoices)
        .values({
          trainerId,
          ...input,
          amountCents,
          currency: 'BRL',
          status: 'issued',
          issuedAt: now,
          createdAt: now,
        })
        .returning();
      if (invoice === undefined) throw new Error('Fatura não pôde ser emitida');

      return { subscription: toSubscription(subscription), invoice: toInvoice(invoice) };
    });
  }

  async findInvoiceForTrainer(
    invoiceId: string,
    trainerId: string,
  ): Promise<BillingInvoice | null> {
    const invoice = await db.query.billingInvoices.findFirst({
      where: and(
        eq(schema.billingInvoices.id, invoiceId),
        eq(schema.billingInvoices.trainerId, trainerId),
      ),
    });
    return invoice === undefined ? null : toInvoice(invoice);
  }
}
