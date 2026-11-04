import { describe, expect, it } from 'vitest';
import {
  notificationPreferencesSchema,
  updateNotificationPreferencesSchema,
} from './notifications.js';

describe('contratos de preferências de notificação', () => {
  it('aplica os defaults aprovados', () => {
    expect(
      notificationPreferencesSchema.parse({
        inactivity: { enabled: true },
        workoutPlanExpiring: { enabled: false },
        pendingAssessment: { enabled: true },
        newStudentRegistration: { enabled: true },
      }),
    ).toMatchObject({
      inactivity: { afterDays: 7, channel: 'both' },
      workoutPlanExpiring: { daysBefore: 7, channel: 'email' },
      pendingAssessment: { staleAfterDays: 60, channel: 'push' },
      newStudentRegistration: { channel: 'both' },
    });
  });

  it('aceita atualização profunda e rejeita alteração vazia', () => {
    expect(updateNotificationPreferencesSchema.safeParse({}).success).toBe(false);
    expect(updateNotificationPreferencesSchema.parse({ inactivity: { afterDays: 14 } })).toEqual({
      inactivity: { afterDays: 14 },
    });
  });
});
