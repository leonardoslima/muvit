import { UseCaseError } from '../../../shared/use-case-error.js';
import { PLAN_CATALOG } from '../plan-catalog.js';
import type { BillingRepository } from '../repositories/billing-repository.js';

export class GetSubscriptionUseCase {
  constructor(private readonly repository: BillingRepository) {}

  async execute(trainerId: string) {
    const overview = await this.repository.getOverview(trainerId);
    if (overview === null || overview.subscription === null) {
      throw new UseCaseError('not_found', 'Assinatura não encontrada.');
    }

    return {
      catalog: PLAN_CATALOG,
      subscription: overview.subscription,
      usage: {
        activeStudents: overview.activeStudentCount,
        activeStudentLimit: PLAN_CATALOG[overview.subscription.plan].activeStudentLimit,
      },
      invoices: overview.invoices,
    };
  }
}
