import { UseCaseError } from '../../../shared/use-case-error.js';
import type { BillingRepository } from '../repositories/billing-repository.js';

export class GetInvoiceUseCase {
  constructor(private readonly repository: BillingRepository) {}

  async execute(invoiceId: string, trainerId: string) {
    const invoice = await this.repository.findInvoiceForTrainer(invoiceId, trainerId);
    if (invoice === null) throw new UseCaseError('not_found', 'Fatura não encontrada.');
    return invoice;
  }
}
