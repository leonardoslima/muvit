import { z } from 'zod';

export const notificationChannelSchema = z.enum(['email', 'push', 'both']);

export const NOTIFICATION_DAY_LIMITS = {
  inactivityAfterDays: 90,
  workoutPlanExpiringDaysBefore: 30,
  pendingAssessmentStaleAfterDays: 365,
} as const;

const inactivityPreferencesSchema = z.object({
  enabled: z.boolean(),
  afterDays: z.number().int().min(1).max(NOTIFICATION_DAY_LIMITS.inactivityAfterDays).default(7),
  channel: notificationChannelSchema.default('both'),
});

const workoutPlanExpiringPreferencesSchema = z.object({
  enabled: z.boolean(),
  daysBefore: z
    .number()
    .int()
    .min(1)
    .max(NOTIFICATION_DAY_LIMITS.workoutPlanExpiringDaysBefore)
    .default(7),
  channel: notificationChannelSchema.default('email'),
});

const pendingAssessmentPreferencesSchema = z.object({
  enabled: z.boolean(),
  staleAfterDays: z
    .number()
    .int()
    .min(1)
    .max(NOTIFICATION_DAY_LIMITS.pendingAssessmentStaleAfterDays)
    .default(60),
  channel: notificationChannelSchema.default('push'),
});

const newStudentRegistrationPreferencesSchema = z.object({
  enabled: z.boolean(),
  channel: notificationChannelSchema.default('both'),
});

export const notificationPreferencesSchema = z.object({
  inactivity: inactivityPreferencesSchema,
  workoutPlanExpiring: workoutPlanExpiringPreferencesSchema,
  pendingAssessment: pendingAssessmentPreferencesSchema,
  newStudentRegistration: newStudentRegistrationPreferencesSchema,
});

export const updateNotificationPreferencesSchema = z
  .object({
    inactivity: inactivityPreferencesSchema.partial(),
    workoutPlanExpiring: workoutPlanExpiringPreferencesSchema.partial(),
    pendingAssessment: pendingAssessmentPreferencesSchema.partial(),
    newStudentRegistration: newStudentRegistrationPreferencesSchema.partial(),
  })
  .partial()
  .refine(
    (preferences) =>
      Object.values(preferences).some(
        (section) =>
          section !== undefined && Object.values(section).some((value) => value !== undefined),
      ),
    { message: 'Informe ao menos uma preferência para atualizar.' },
  );

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
