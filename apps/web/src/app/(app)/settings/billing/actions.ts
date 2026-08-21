'use server';

import { parseSubscriptionFormData } from '@/application/settings/subscription-form-data';
import { configureServerClient } from '@/lib/api-client';
import { updateTrainerSubscription } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';

export type SubscriptionActionResult = { error?: string };

export async function updateSubscriptionAction(
  formData: FormData,
): Promise<SubscriptionActionResult> {
  const submission = parseSubscriptionFormData(formData);
  if (!submission.ok) return { error: submission.error };

  const client = await configureServerClient();
  const response = await updateTrainerSubscription({ client, body: submission.body });
  if (response.error || !response.data) {
    return { error: 'Não é possível concluir esta troca de plano com o uso atual.' };
  }

  revalidatePath('/settings', 'layout');
  revalidatePath('/settings/billing');
  return {};
}
