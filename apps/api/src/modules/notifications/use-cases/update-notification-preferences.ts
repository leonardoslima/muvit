import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from '@muvit/validators';
import type { NotificationPreferencesRepository } from '../repositories/notifications-repository.js';

export class UpdateNotificationPreferencesUseCase {
  constructor(private readonly repository: NotificationPreferencesRepository) {}

  async execute(
    trainerId: string,
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    return this.repository.updatePreferences(trainerId, input);
  }
}
