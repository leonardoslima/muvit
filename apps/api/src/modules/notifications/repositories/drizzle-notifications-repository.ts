import { db, schema } from '@muvit/db';
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from '@muvit/validators';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  mergeNotificationPreferences,
} from '../notification-preferences.js';
import type { NotificationsRepository } from './notifications-repository.js';

function toNotificationPreferences(
  row: typeof schema.trainerNotificationPreferences.$inferSelect,
): NotificationPreferences {
  return {
    inactivity: {
      enabled: row.inactivityEnabled,
      afterDays: row.inactivityAfterDays,
      channel: row.inactivityChannel,
    },
    workoutPlanExpiring: {
      enabled: row.workoutPlanExpiringEnabled,
      daysBefore: row.workoutPlanExpiringDaysBefore,
      channel: row.workoutPlanExpiringChannel,
    },
    pendingAssessment: {
      enabled: row.pendingAssessmentEnabled,
      staleAfterDays: row.pendingAssessmentStaleAfterDays,
      channel: row.pendingAssessmentChannel,
    },
    newStudentRegistration: {
      enabled: row.newStudentRegistrationEnabled,
      channel: row.newStudentRegistrationChannel,
    },
  };
}

function toPersistenceValues(preferences: NotificationPreferences) {
  return {
    inactivityEnabled: preferences.inactivity.enabled,
    inactivityAfterDays: preferences.inactivity.afterDays,
    inactivityChannel: preferences.inactivity.channel,
    workoutPlanExpiringEnabled: preferences.workoutPlanExpiring.enabled,
    workoutPlanExpiringDaysBefore: preferences.workoutPlanExpiring.daysBefore,
    workoutPlanExpiringChannel: preferences.workoutPlanExpiring.channel,
    pendingAssessmentEnabled: preferences.pendingAssessment.enabled,
    pendingAssessmentStaleAfterDays: preferences.pendingAssessment.staleAfterDays,
    pendingAssessmentChannel: preferences.pendingAssessment.channel,
    newStudentRegistrationEnabled: preferences.newStudentRegistration.enabled,
    newStudentRegistrationChannel: preferences.newStudentRegistration.channel,
  };
}

export class DrizzleNotificationsRepository implements NotificationsRepository {
  async findPreferences(trainerId: string) {
    const row = await db.query.trainerNotificationPreferences.findFirst({
      where: eq(schema.trainerNotificationPreferences.trainerId, trainerId),
    });
    return row === undefined ? null : toNotificationPreferences(row);
  }

  async updatePreferences(trainerId: string, input: UpdateNotificationPreferencesInput) {
    return db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${trainerId}, 1))`,
      );
      const currentRow = await transaction.query.trainerNotificationPreferences.findFirst({
        where: eq(schema.trainerNotificationPreferences.trainerId, trainerId),
      });
      const current =
        currentRow === undefined
          ? DEFAULT_NOTIFICATION_PREFERENCES
          : toNotificationPreferences(currentRow);
      const preferences = mergeNotificationPreferences(current, input);
      const values = toPersistenceValues(preferences);
      const [row] = await transaction
        .insert(schema.trainerNotificationPreferences)
        .values({ trainerId, ...values })
        .onConflictDoUpdate({
          target: schema.trainerNotificationPreferences.trainerId,
          set: values,
        })
        .returning();
      if (row === undefined) throw new Error('Preferências de notificação não foram persistidas');
      return toNotificationPreferences(row);
    });
  }

  async listActiveStudents() {
    return db.query.students.findMany({
      with: { trainer: true },
      where: eq(schema.students.status, 'active'),
    });
  }

  async hasRecentWorkoutLog(studentId: string, inactiveSince: string) {
    const recentLog = await db.query.workoutLogs.findFirst({
      where: and(
        eq(schema.workoutLogs.studentId, studentId),
        gte(schema.workoutLogs.date, inactiveSince),
      ),
    });
    return Boolean(recentLog);
  }

  async findLastAssessmentDate(studentId: string) {
    const lastAssessment = await db.query.assessments.findFirst({
      where: eq(schema.assessments.studentId, studentId),
      orderBy: desc(schema.assessments.date),
      columns: { date: true },
    });
    return lastAssessment?.date ?? null;
  }

  async findActiveWorkoutPlanEndDate(
    studentId: string,
    startsOnOrAfter: string,
    endsOnOrBefore: string,
  ) {
    const workoutPlan = await db.query.workoutPlans.findFirst({
      where: and(
        eq(schema.workoutPlans.studentId, studentId),
        eq(schema.workoutPlans.status, 'active'),
        gte(schema.workoutPlans.endDate, startsOnOrAfter),
        lte(schema.workoutPlans.endDate, endsOnOrBefore),
      ),
      orderBy: asc(schema.workoutPlans.endDate),
      columns: { endDate: true },
    });
    return workoutPlan?.endDate ?? null;
  }

  async findTrainerEmail(trainerId: string) {
    const trainer = await db.query.trainers.findFirst({
      where: eq(schema.trainers.id, trainerId),
      columns: { email: true },
    });
    return trainer?.email ?? null;
  }
}
