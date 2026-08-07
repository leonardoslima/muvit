import type { UpdateTrainerSubscriptionInput } from '@muvit/validators';
import type { RequestIdentity } from '../../../shared/request-identity.js';
import { UseCaseError } from '../../../shared/use-case-error.js';
import { PLAN_CATALOG, getPlanPriceCents } from '../plan-catalog.js';
import type { BillingRepository } from '../repositories/billing-repository.js';

export class UpdateSubscriptionUseCase {
  constructor(
    private readonly repository: BillingRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(identity: RequestIdentity, input: UpdateTrainerSubscriptionInput) {
    const activeStudentCount = await this.repository.countActiveStudents(identity.profileId);
    const limit = PLAN_CATALOG[input.plan].activeStudentLimit;
    if (limit !== null && activeStudentCount > limit) {
      throw new UseCaseError(
        'plan_limit_conflict',
        `O plano selecionado aceita até ${limit} alunos ativos.`,
      );
    }

    return this.repository.changeSubscription(
      identity.profileId,
      input,
      getPlanPriceCents(input.plan, input.billingInterval),
      this.now(),
    );
  }
}
