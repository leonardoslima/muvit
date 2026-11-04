import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from '@muvit/validators';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inactivity: { enabled: true, afterDays: 7, channel: 'both' },
  workoutPlanExpiring: { enabled: true, daysBefore: 7, channel: 'email' },
  pendingAssessment: { enabled: true, staleAfterDays: 60, channel: 'push' },
  newStudentRegistration: { enabled: true, channel: 'both' },
};

export function mergeNotificationPreferences(
  current: NotificationPreferences,
  input: UpdateNotificationPreferencesInput,
): NotificationPreferences {
  return {
    inactivity: { ...current.inactivity, ...input.inactivity },
    workoutPlanExpiring: { ...current.workoutPlanExpiring, ...input.workoutPlanExpiring },
    pendingAssessment: { ...current.pendingAssessment, ...input.pendingAssessment },
    newStudentRegistration: {
      ...current.newStudentRegistration,
      ...input.newStudentRegistration,
    },
  };
}
