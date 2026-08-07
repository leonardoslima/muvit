import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from '@muvit/validators';
import { describe, expect, it } from 'vitest';
import type { NotificationPreferencesRepository } from '../repositories/notifications-repository.js';
import { GetNotificationPreferencesUseCase } from './get-notification-preferences.js';
import { UpdateNotificationPreferencesUseCase } from './update-notification-preferences.js';

class InMemoryPreferencesRepository implements NotificationPreferencesRepository {
  private readonly preferences = new Map<string, NotificationPreferences>();

  async findPreferences(trainerId: string): Promise<NotificationPreferences | null> {
    return this.preferences.get(trainerId) ?? null;
  }

  async savePreferences(
    trainerId: string,
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    this.preferences.set(trainerId, preferences);
    return preferences;
  }
}

describe('preferências de notificação', () => {
  it('retorna defaults efetivos quando o treinador ainda não persistiu preferências', async () => {
    const repository = new InMemoryPreferencesRepository();
    const getPreferences = new GetNotificationPreferencesUseCase(repository);

    await expect(getPreferences.execute('trainer-1')).resolves.toEqual({
      inactivity: { enabled: true, afterDays: 7, channel: 'both' },
      workoutPlanExpiring: { enabled: true, daysBefore: 7, channel: 'email' },
      pendingAssessment: { enabled: true, staleAfterDays: 60, channel: 'push' },
      newStudentRegistration: { enabled: true, channel: 'both' },
    });
  });

  it('mescla atualização parcial com os valores efetivos e mantém o resultado no upsert', async () => {
    const repository = new InMemoryPreferencesRepository();
    const updatePreferences = new UpdateNotificationPreferencesUseCase(repository);
    const input: UpdateNotificationPreferencesInput = {
      inactivity: { enabled: false },
      pendingAssessment: { staleAfterDays: 30, channel: 'email' },
    };

    const first = await updatePreferences.execute('trainer-1', input);
    const second = await updatePreferences.execute('trainer-1', input);

    expect(first).toEqual({
      inactivity: { enabled: false, afterDays: 7, channel: 'both' },
      workoutPlanExpiring: { enabled: true, daysBefore: 7, channel: 'email' },
      pendingAssessment: { enabled: true, staleAfterDays: 30, channel: 'email' },
      newStudentRegistration: { enabled: true, channel: 'both' },
    });
    expect(second).toEqual(first);
  });
});
