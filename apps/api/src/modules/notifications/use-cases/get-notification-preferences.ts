import type { NotificationPreferences } from '@muvit/validators';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../notification-preferences.js';
import type { NotificationPreferencesRepository } from '../repositories/notifications-repository.js';

export async function findEffectiveNotificationPreferences(
  repository: Pick<NotificationPreferencesRepository, 'findPreferences'>,
  trainerId: string,
): Promise<NotificationPreferences> {
  return (await repository.findPreferences(trainerId)) ?? DEFAULT_NOTIFICATION_PREFERENCES;
}

export class GetNotificationPreferencesUseCase {
  constructor(private readonly repository: NotificationPreferencesRepository) {}

  async execute(trainerId: string): Promise<NotificationPreferences> {
    return findEffectiveNotificationPreferences(this.repository, trainerId);
  }
}
