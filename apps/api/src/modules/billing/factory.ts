import { DrizzleBillingRepository } from './repositories/drizzle-billing-repository.js';
import { GetInvoiceUseCase } from './use-cases/get-invoice.js';
import { GetSubscriptionUseCase } from './use-cases/get-subscription.js';
import { UpdateSubscriptionUseCase } from './use-cases/update-subscription.js';

export function makeBillingModule() {
  const repository = new DrizzleBillingRepository();

  return {
    getSubscription: new GetSubscriptionUseCase(repository),
    updateSubscription: new UpdateSubscriptionUseCase(repository),
    getInvoice: new GetInvoiceUseCase(repository),
  };
}
