import { describe, expect, it } from 'vitest';
import { parseNotificationFormData } from './notification-form-data';

describe('parseNotificationFormData', () => {
  it('converte controles de notificação no payload completo da API', () => {
    const formData = new FormData();
    formData.set('inactivityEnabled', 'on');
    formData.set('inactivityAfterDays', '7');
    formData.set('inactivityChannel', 'both');
    formData.set('workoutPlanExpiringEnabled', '');
    formData.set('workoutPlanExpiringDaysBefore', '5');
    formData.set('workoutPlanExpiringChannel', 'email');
    formData.set('pendingAssessmentEnabled', 'on');
    formData.set('pendingAssessmentStaleAfterDays', '14');
    formData.set('pendingAssessmentChannel', 'push');
    formData.set('newStudentRegistrationEnabled', 'on');
    formData.set('newStudentRegistrationChannel', 'both');

    expect(parseNotificationFormData(formData)).toEqual({
      inactivity: { enabled: true, afterDays: 7, channel: 'both' },
      workoutPlanExpiring: { enabled: false, daysBefore: 5, channel: 'email' },
      pendingAssessment: { enabled: true, staleAfterDays: 14, channel: 'push' },
      newStudentRegistration: { enabled: true, channel: 'both' },
    });
  });
});
