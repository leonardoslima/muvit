import { z } from 'zod';
import { trainerPlanSchema } from './trainers';

const dateTimeSchema = z.string().datetime();

export const billingIntervalSchema = z.enum(['monthly', 'annual']);
export const subscriptionStatusSchema = z.enum(['active', 'canceled']);
export const invoiceStatusSchema = z.enum(['issued', 'paid', 'void']);

export const trainerSubscriptionSchema = z.object({
  plan: trainerPlanSchema,
  billingInterval: billingIntervalSchema,
  status: subscriptionStatusSchema,
  startsAt: dateTimeSchema,
  renewsAt: dateTimeSchema.nullable(),
});

export const updateTrainerSubscriptionSchema = trainerSubscriptionSchema.pick({
  plan: true,
  billingInterval: true,
});

export const billingInvoiceSchema = z.object({
  id: z.string().uuid(),
  trainerId: z.string().uuid(),
  plan: trainerPlanSchema,
  billingInterval: billingIntervalSchema,
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).default('BRL'),
  status: invoiceStatusSchema,
  issuedAt: dateTimeSchema,
  paidAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
});

export type TrainerSubscription = z.infer<typeof trainerSubscriptionSchema>;
export type UpdateTrainerSubscriptionInput = z.infer<typeof updateTrainerSubscriptionSchema>;
export type BillingInvoice = z.infer<typeof billingInvoiceSchema>;
