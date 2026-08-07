import { DrizzleTrainerPlanMutationLock } from '../trainer-plan/repositories/drizzle-trainer-plan-mutation-lock.js';
import { DrizzleBillingRepository } from './repositories/drizzle-billing-repository.js';
import { GetInvoiceUseCase } from './use-cases/get-invoice.js';
import { GetSubscriptionUseCase } from './use-cases/get-subscription.js';
import { UpdateSubscriptionUseCase } from './use-cases/update-subscription.js';

export function makeBillingModule() {
  const repository = new DrizzleBillingRepository();
  const trainerPlanMutationLock = new DrizzleTrainerPlanMutationLock();

  return {
    getSubscription: new GetSubscriptionUseCase(repository),
    updateSubscription: new UpdateSubscriptionUseCase(repository, trainerPlanMutationLock),
    getInvoice: new GetInvoiceUseCase(repository),
  };
}
