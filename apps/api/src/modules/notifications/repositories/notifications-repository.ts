import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from '@muvit/validators';

export type ActiveStudentForNotification = {
  id: string;
  name: string;
  expoPushToken: string | null;
  createdAt: Date;
  trainer: { id: string; email: string | null } | null;
};

export interface NotificationPreferencesRepository {
  findPreferences(trainerId: string): Promise<NotificationPreferences | null>;
  updatePreferences(
    trainerId: string,
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences>;
}

export interface DailyNotificationsRepository {
  listActiveStudents(): Promise<ActiveStudentForNotification[]>;
  findPreferences(trainerId: string): Promise<NotificationPreferences | null>;
  hasRecentWorkoutLog(studentId: string, inactiveSince: string): Promise<boolean>;
  findLastAssessmentDate(studentId: string): Promise<string | null>;
  findActiveWorkoutPlanEndDate(
    studentId: string,
    startsOnOrAfter: string,
    endsOnOrBefore: string,
  ): Promise<string | null>;
}

export interface NewStudentNotificationRepository {
  findPreferences(trainerId: string): Promise<NotificationPreferences | null>;
  findTrainerEmail(trainerId: string): Promise<string | null>;
}

export interface NotificationsRepository
  extends NotificationPreferencesRepository,
    DailyNotificationsRepository,
    NewStudentNotificationRepository {}
