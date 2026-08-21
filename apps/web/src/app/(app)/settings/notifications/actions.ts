'use server';

import { parseNotificationFormData } from '@/application/settings/notification-form-data';
import { configureServerClient } from '@/lib/api-client';
import { updateTrainerNotificationPreferences } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';

export type NotificationFormState = { error?: string; success?: true } | null;

export async function updateNotificationPreferencesAction(
  _: NotificationFormState,
  formData: FormData,
): Promise<NotificationFormState> {
  const client = await configureServerClient();
  const response = await updateTrainerNotificationPreferences({
    client,
    body: parseNotificationFormData(formData),
  });
  if (response.error || !response.data) {
    return {
      error: 'Não foi possível salvar suas preferências. Revise os campos e tente novamente.',
    };
  }

  revalidatePath('/settings', 'layout');
  revalidatePath('/settings/notifications');
  return { success: true };
}
