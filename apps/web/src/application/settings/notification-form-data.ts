import type { UpdateTrainerNotificationPreferencesData } from '@/lib/api/types.gen';

type NotificationPreferences = UpdateTrainerNotificationPreferencesData['body'];
type NotificationChannel = 'email' | 'push' | 'both';

export function parseNotificationFormData(formData: FormData): NotificationPreferences {
  return {
    inactivity: {
      enabled: formData.get('inactivityEnabled') === 'on',
      afterDays: readDays(formData, 'inactivityAfterDays'),
      channel: readChannel(formData, 'inactivityChannel'),
    },
    workoutPlanExpiring: {
      enabled: formData.get('workoutPlanExpiringEnabled') === 'on',
      daysBefore: readDays(formData, 'workoutPlanExpiringDaysBefore'),
      channel: readChannel(formData, 'workoutPlanExpiringChannel'),
    },
    pendingAssessment: {
      enabled: formData.get('pendingAssessmentEnabled') === 'on',
      staleAfterDays: readDays(formData, 'pendingAssessmentStaleAfterDays'),
      channel: readChannel(formData, 'pendingAssessmentChannel'),
    },
    newStudentRegistration: {
      enabled: formData.get('newStudentRegistrationEnabled') === 'on',
      channel: readChannel(formData, 'newStudentRegistrationChannel'),
    },
  };
}

function readDays(formData: FormData, name: string): number | undefined {
  const value = Number(formData.get(name));
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function readChannel(formData: FormData, name: string): NotificationChannel | undefined {
  const value = formData.get(name);
  return value === 'email' || value === 'push' || value === 'both' ? value : undefined;
}
