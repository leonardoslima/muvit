import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from '@muvit/validators';
import type { NotificationPreferencesRepository } from '../repositories/notifications-repository.js';
import { findEffectiveNotificationPreferences } from './get-notification-preferences.js';

export class UpdateNotificationPreferencesUseCase {
  constructor(private readonly repository: NotificationPreferencesRepository) {}

  async execute(
    trainerId: string,
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    const current = await findEffectiveNotificationPreferences(this.repository, trainerId);
    return this.repository.savePreferences(trainerId, {
      inactivity: { ...current.inactivity, ...input.inactivity },
      workoutPlanExpiring: { ...current.workoutPlanExpiring, ...input.workoutPlanExpiring },
      pendingAssessment: { ...current.pendingAssessment, ...input.pendingAssessment },
      newStudentRegistration: {
        ...current.newStudentRegistration,
        ...input.newStudentRegistration,
      },
    });
  }
}
