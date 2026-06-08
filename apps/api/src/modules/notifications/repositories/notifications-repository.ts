export type ActiveStudentForNotification = {
  id: string;
  name: string;
  expoPushToken: string | null;
  trainer: { email: string | null } | null;
};

export interface NotificationsRepository {
  listActiveStudents(): Promise<ActiveStudentForNotification[]>;
  hasRecentWorkoutLog(studentId: string, inactiveSince: string): Promise<boolean>;
  findLastAssessmentDate(studentId: string): Promise<string | null>;
}
