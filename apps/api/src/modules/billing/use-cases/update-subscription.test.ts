import type { UpdateTrainerSubscriptionInput } from '@muvit/validators';
import { describe, expect, it } from 'vitest';
import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { TrainerPlanMutationLock } from '../../trainer-plan/trainer-plan-mutation-lock.js';
import { PLAN_CATALOG } from '../plan-catalog.js';
import type {
  BillingRepository,
  ChangeSubscriptionResult,
} from '../repositories/billing-repository.js';
import { UpdateSubscriptionUseCase } from './update-subscription.js';

const trainerIdentity: RequestIdentity = {
  authUserId: 'auth-trainer-id',
  profileId: 'trainer-id',
  role: 'trainer',
};

const immediateTrainerPlanMutationLock: TrainerPlanMutationLock = {
  withTrainerPlanMutationLock: async (_trainerId, operation) => operation(),
};

class FakeBillingRepository implements BillingRepository {
  activeStudentCount = 0;
  changedSubscription: (UpdateTrainerSubscriptionInput & { trainerId: string }) | null = null;

  async getOverview() {
    return null;
  }

  async countActiveStudents() {
    return this.activeStudentCount;
  }

  async changeSubscription(
    trainerId: string,
    input: UpdateTrainerSubscriptionInput,
    amountCents: number,
    now: Date,
  ): Promise<ChangeSubscriptionResult> {
    this.changedSubscription = { trainerId, ...input };
    return {
      subscription: {
        plan: input.plan,
        billingInterval: input.billingInterval,
        status: 'active',
        startsAt: now.toISOString(),
        renewsAt: new Date(now.getTime() + 86_400_000).toISOString(),
      },
      invoice: {
        id: '00000000-0000-4000-8000-000000000001',
        trainerId,
        plan: input.plan,
        billingInterval: input.billingInterval,
        amountCents,
        currency: 'BRL',
        status: 'issued',
        issuedAt: now.toISOString(),
        paidAt: null,
        createdAt: now.toISOString(),
      },
    };
  }

  async findInvoiceForTrainer() {
    return null;
  }
}

describe('PLAN_CATALOG', () => {
  it('expõe os limites e preços aprovados para os planos de treinador', () => {
    expect(PLAN_CATALOG).toEqual({
      free: { activeStudentLimit: 3, monthlyPriceCents: 0, annualPriceCents: 0 },
      starter: { activeStudentLimit: 15, monthlyPriceCents: 4990, annualPriceCents: 47880 },
      pro: { activeStudentLimit: 50, monthlyPriceCents: 9990, annualPriceCents: 95880 },
      team: { activeStudentLimit: null, monthlyPriceCents: 19990, annualPriceCents: 191880 },
    });
  });
});

describe('UpdateSubscriptionUseCase', () => {
  it('troca plano e periodicidade e emite fatura interna na mesma operação', async () => {
    const repository = new FakeBillingRepository();
    const useCase = new UpdateSubscriptionUseCase(
      repository,
      immediateTrainerPlanMutationLock,
      () => new Date('2026-08-07T12:00:00.000Z'),
    );

    const result = await useCase.execute(trainerIdentity, {
      plan: 'pro',
      billingInterval: 'annual',
    });

    expect(result).toMatchObject({
      subscription: { plan: 'pro', billingInterval: 'annual' },
      invoice: { plan: 'pro', status: 'issued', amountCents: 95880 },
    });
    expect(repository.changedSubscription).toEqual({
      trainerId: 'trainer-id',
      plan: 'pro',
      billingInterval: 'annual',
    });
  });

  it('bloqueia downgrade abaixo da quantidade atual de alunos ativos', async () => {
    const repository = new FakeBillingRepository();
    repository.activeStudentCount = 16;
    const useCase = new UpdateSubscriptionUseCase(repository, immediateTrainerPlanMutationLock);

    await expect(
      useCase.execute(trainerIdentity, { plan: 'starter', billingInterval: 'monthly' }),
    ).rejects.toMatchObject({ code: 'plan_limit_conflict' });
    expect(repository.changedSubscription).toBeNull();
  });
});
