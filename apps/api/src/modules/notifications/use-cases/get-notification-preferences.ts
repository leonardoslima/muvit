import type { NotificationPreferences } from '@muvit/validators';
import type { NotificationPreferencesRepository } from '../repositories/notifications-repository.js';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inactivity: { enabled: true, afterDays: 7, channel: 'both' },
  workoutPlanExpiring: { enabled: true, daysBefore: 7, channel: 'email' },
  pendingAssessment: { enabled: true, staleAfterDays: 60, channel: 'push' },
  newStudentRegistration: { enabled: true, channel: 'both' },
};

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
