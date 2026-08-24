'use server';

import {
  type NotificationFormState,
  buildNotificationSubmission,
} from '@/application/settings/notification-form-data';
import { configureServerClient } from '@/lib/api-client';
import { updateTrainerNotificationPreferences } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';

export type { NotificationFormState };

export async function updateNotificationPreferencesAction(
  _: NotificationFormState,
  formData: FormData,
): Promise<NotificationFormState> {
  const submission = buildNotificationSubmission(formData);
  if (!submission.ok) {
    return submission.state;
  }

  const client = await configureServerClient();
  const response = await updateTrainerNotificationPreferences({
    client,
    body: submission.body,
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
