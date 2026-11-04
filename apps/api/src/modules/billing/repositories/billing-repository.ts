import type {
  BillingInvoice,
  TrainerSubscription,
  UpdateTrainerSubscriptionInput,
} from '@muvit/validators';

export type BillingOverviewData = {
  subscription: TrainerSubscription | null;
  invoices: BillingInvoice[];
  activeStudentCount: number;
};

export type ChangeSubscriptionResult = {
  subscription: TrainerSubscription;
  invoice: BillingInvoice | null;
};

export interface BillingRepository {
  getOverview(trainerId: string): Promise<BillingOverviewData | null>;
  countActiveStudents(trainerId: string): Promise<number>;
  changeSubscription(
    trainerId: string,
    input: UpdateTrainerSubscriptionInput,
    amountCents: number,
    now: Date,
  ): Promise<ChangeSubscriptionResult>;
  findInvoiceForTrainer(invoiceId: string, trainerId: string): Promise<BillingInvoice | null>;
}
