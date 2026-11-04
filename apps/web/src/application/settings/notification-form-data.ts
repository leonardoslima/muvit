import type { UpdateTrainerNotificationPreferencesData } from '@/lib/api/types.gen';
import { NOTIFICATION_DAY_LIMITS, updateNotificationPreferencesSchema } from '@muvit/validators';
import { readTrimmed } from '../form-data';

type NotificationPreferences = UpdateTrainerNotificationPreferencesData['body'];
type NotificationChannel = 'email' | 'push' | 'both';

export type NotificationFormField =
  | 'inactivityAfterDays'
  | 'inactivityChannel'
  | 'workoutPlanExpiringDaysBefore'
  | 'workoutPlanExpiringChannel'
  | 'pendingAssessmentStaleAfterDays'
  | 'pendingAssessmentChannel'
  | 'newStudentRegistrationChannel';

export type NotificationFormState = {
  error?: string;
  fieldErrors?: Partial<Record<NotificationFormField, string>>;
  success?: true;
} | null;

type NotificationSubmission =
  | { ok: true; body: NotificationPreferences }
  | { ok: false; state: Exclude<NotificationFormState, null> };

export function buildNotificationSubmission(formData: FormData): NotificationSubmission {
  const fieldErrors: Partial<Record<NotificationFormField, string>> = {};
  const inactivityAfterDays = readRequiredDays(
    formData,
    'inactivityAfterDays',
    NOTIFICATION_DAY_LIMITS.inactivityAfterDays,
    'Informe os dias de inatividade.',
    fieldErrors,
  );
  const workoutPlanExpiringDaysBefore = readRequiredDays(
    formData,
    'workoutPlanExpiringDaysBefore',
    NOTIFICATION_DAY_LIMITS.workoutPlanExpiringDaysBefore,
    'Informe os dias antes do vencimento.',
    fieldErrors,
  );
  const pendingAssessmentStaleAfterDays = readRequiredDays(
    formData,
    'pendingAssessmentStaleAfterDays',
    NOTIFICATION_DAY_LIMITS.pendingAssessmentStaleAfterDays,
    'Informe os dias sem avaliação.',
    fieldErrors,
  );
  const inactivityChannel = readChannel(formData, 'inactivityChannel', fieldErrors);
  const workoutPlanExpiringChannel = readChannel(
    formData,
    'workoutPlanExpiringChannel',
    fieldErrors,
  );
  const pendingAssessmentChannel = readChannel(formData, 'pendingAssessmentChannel', fieldErrors);
  const newStudentRegistrationChannel = readChannel(
    formData,
    'newStudentRegistrationChannel',
    fieldErrors,
  );

  if (
    Object.keys(fieldErrors).length > 0 ||
    inactivityAfterDays === undefined ||
    workoutPlanExpiringDaysBefore === undefined ||
    pendingAssessmentStaleAfterDays === undefined ||
    inactivityChannel === undefined ||
    workoutPlanExpiringChannel === undefined ||
    pendingAssessmentChannel === undefined ||
    newStudentRegistrationChannel === undefined
  ) {
    return {
      ok: false,
      state: { error: 'Revise os campos destacados.', fieldErrors },
    };
  }

  const body = {
    inactivity: {
      enabled: formData.get('inactivityEnabled') === 'on',
      afterDays: inactivityAfterDays,
      channel: inactivityChannel,
    },
    workoutPlanExpiring: {
      enabled: formData.get('workoutPlanExpiringEnabled') === 'on',
      daysBefore: workoutPlanExpiringDaysBefore,
      channel: workoutPlanExpiringChannel,
    },
    pendingAssessment: {
      enabled: formData.get('pendingAssessmentEnabled') === 'on',
      staleAfterDays: pendingAssessmentStaleAfterDays,
      channel: pendingAssessmentChannel,
    },
    newStudentRegistration: {
      enabled: formData.get('newStudentRegistrationEnabled') === 'on',
      channel: newStudentRegistrationChannel,
    },
  };

  const validation = updateNotificationPreferencesSchema.safeParse(body);
  if (!validation.success) {
    return {
      ok: false,
      state: { error: 'Revise os campos destacados.', fieldErrors },
    };
  }

  return { ok: true, body: validation.data };
}

function readRequiredDays(
  formData: FormData,
  name: Extract<NotificationFormField, `${string}Days${string}`>,
  maximum: number,
  requiredMessage: string,
  fieldErrors: Partial<Record<NotificationFormField, string>>,
): number | undefined {
  const value = readTrimmed(formData, name);
  if (!value) {
    fieldErrors[name] = requiredMessage;
    return undefined;
  }

  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > maximum) {
    fieldErrors[name] = `Informe um valor entre 1 e ${maximum} dias.`;
    return undefined;
  }

  return days;
}

function readChannel(
  formData: FormData,
  name: Extract<NotificationFormField, `${string}Channel`>,
  fieldErrors: Partial<Record<NotificationFormField, string>>,
): NotificationChannel | undefined {
  const value = readTrimmed(formData, name);
  if (value === 'email' || value === 'push' || value === 'both') {
    return value;
  }

  fieldErrors[name] = 'Selecione um canal válido.';
  return undefined;
}
