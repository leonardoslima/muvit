import { describe, expect, it } from 'vitest';
import { buildNotificationSubmission } from './notification-form-data';

function validFormData(): FormData {
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
  return formData;
}

describe('buildNotificationSubmission', () => {
  it('converte controles de notificação no payload completo da API', () => {
    expect(buildNotificationSubmission(validFormData())).toEqual({
      ok: true,
      body: {
        inactivity: { enabled: true, afterDays: 7, channel: 'both' },
        workoutPlanExpiring: { enabled: false, daysBefore: 5, channel: 'email' },
        pendingAssessment: { enabled: true, staleAfterDays: 14, channel: 'push' },
        newStudentRegistration: { enabled: true, channel: 'both' },
      },
    });
  });

  it('rejeita prazo vazio no FormData bruto em vez de omitir o campo', () => {
    const formData = validFormData();
    formData.set('inactivityAfterDays', '');

    expect(buildNotificationSubmission(formData)).toEqual({
      ok: false,
      state: {
        error: 'Revise os campos destacados.',
        fieldErrors: { inactivityAfterDays: 'Informe os dias de inatividade.' },
      },
    });
  });

  it.each([
    ['inactivityAfterDays', '91', 'Informe um valor entre 1 e 90 dias.'],
    ['workoutPlanExpiringDaysBefore', '31', 'Informe um valor entre 1 e 30 dias.'],
    ['pendingAssessmentStaleAfterDays', '366', 'Informe um valor entre 1 e 365 dias.'],
  ])('associa o limite de %s ao próprio campo', (field, value, message) => {
    const formData = validFormData();
    formData.set(field, value);

    const result = buildNotificationSubmission(formData);

    expect(result).toMatchObject({
      ok: false,
      state: { fieldErrors: { [field]: message } },
    });
  });
});
