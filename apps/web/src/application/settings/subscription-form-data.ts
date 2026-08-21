import type { UpdateTrainerSubscriptionData } from '@/lib/api/types.gen';

type SubscriptionBody = UpdateTrainerSubscriptionData['body'];

export type SubscriptionFormData =
  | { ok: true; body: SubscriptionBody }
  | { ok: false; error: string };

export function parseSubscriptionFormData(formData: FormData): SubscriptionFormData {
  const plan = formData.get('plan');
  const billingInterval = formData.get('billingInterval');
  if (!isPlan(plan) || !isBillingInterval(billingInterval)) {
    return { ok: false, error: 'Selecione um plano e uma periodicidade válidos.' };
  }
  return { ok: true, body: { plan, billingInterval } };
}

function isPlan(value: FormDataEntryValue | null): value is SubscriptionBody['plan'] {
  return value === 'free' || value === 'starter' || value === 'pro' || value === 'team';
}

function isBillingInterval(
  value: FormDataEntryValue | null,
): value is SubscriptionBody['billingInterval'] {
  return value === 'monthly' || value === 'annual';
}
