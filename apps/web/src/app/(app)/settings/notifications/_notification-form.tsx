'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GetTrainerNotificationPreferencesResponse } from '@/lib/api/types.gen';
import { NOTIFICATION_DAY_LIMITS } from '@muvit/validators';
import { useActionState, useState } from 'react';
import { type NotificationFormState, updateNotificationPreferencesAction } from './actions';

type Preferences = GetTrainerNotificationPreferencesResponse;
type NotificationChannel = 'email' | 'push' | 'both';
type NotificationValues = {
  inactivityEnabled: boolean;
  inactivityAfterDays: string;
  inactivityChannel: NotificationChannel;
  workoutPlanExpiringEnabled: boolean;
  workoutPlanExpiringDaysBefore: string;
  workoutPlanExpiringChannel: NotificationChannel;
  pendingAssessmentEnabled: boolean;
  pendingAssessmentStaleAfterDays: string;
  pendingAssessmentChannel: NotificationChannel;
  newStudentRegistrationEnabled: boolean;
  newStudentRegistrationChannel: NotificationChannel;
};

export function NotificationForm({ preferences }: { preferences: Preferences }) {
  const [state, formAction, pending] = useActionState<NotificationFormState, FormData>(
    updateNotificationPreferencesAction,
    null,
  );
  const [values, setValues] = useState<NotificationValues>({
    inactivityEnabled: preferences.inactivity.enabled,
    inactivityAfterDays: preferences.inactivity.afterDays?.toString() ?? '',
    inactivityChannel: preferences.inactivity.channel ?? 'both',
    workoutPlanExpiringEnabled: preferences.workoutPlanExpiring.enabled,
    workoutPlanExpiringDaysBefore: preferences.workoutPlanExpiring.daysBefore?.toString() ?? '',
    workoutPlanExpiringChannel: preferences.workoutPlanExpiring.channel ?? 'email',
    pendingAssessmentEnabled: preferences.pendingAssessment.enabled,
    pendingAssessmentStaleAfterDays: preferences.pendingAssessment.staleAfterDays?.toString() ?? '',
    pendingAssessmentChannel: preferences.pendingAssessment.channel ?? 'push',
    newStudentRegistrationEnabled: preferences.newStudentRegistration.enabled,
    newStudentRegistrationChannel: preferences.newStudentRegistration.channel ?? 'both',
  });

  function updateValue<Name extends keyof NotificationValues>(
    name: Name,
    value: NotificationValues[Name],
  ) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  return (
    <form action={formAction} className="max-w-3xl rounded-[12px] bg-card px-5 shadow-card sm:px-6">
      <NotificationRow
        title="Alertas de inatividade dos alunos"
        description="Avise quando um aluno ficar sem registrar treinos."
        name="inactivity"
        enabled={values.inactivityEnabled}
        onEnabledChange={(enabled) => updateValue('inactivityEnabled', enabled)}
        daysLabel="Dias de inatividade"
        daysName="inactivityAfterDays"
        days={values.inactivityAfterDays}
        daysMax={NOTIFICATION_DAY_LIMITS.inactivityAfterDays}
        daysError={state?.fieldErrors?.inactivityAfterDays}
        onDaysChange={(days) => updateValue('inactivityAfterDays', days)}
        channel={values.inactivityChannel}
        channelError={state?.fieldErrors?.inactivityChannel}
        onChannelChange={(channel) => updateValue('inactivityChannel', channel)}
      />
      <NotificationRow
        title="Planos de treino vencendo"
        description="Receba um lembrete antes de o plano de um aluno expirar."
        name="workoutPlanExpiring"
        enabled={values.workoutPlanExpiringEnabled}
        onEnabledChange={(enabled) => updateValue('workoutPlanExpiringEnabled', enabled)}
        daysLabel="Dias antes do vencimento"
        daysName="workoutPlanExpiringDaysBefore"
        days={values.workoutPlanExpiringDaysBefore}
        daysMax={NOTIFICATION_DAY_LIMITS.workoutPlanExpiringDaysBefore}
        daysError={state?.fieldErrors?.workoutPlanExpiringDaysBefore}
        onDaysChange={(days) => updateValue('workoutPlanExpiringDaysBefore', days)}
        channel={values.workoutPlanExpiringChannel}
        channelError={state?.fieldErrors?.workoutPlanExpiringChannel}
        onChannelChange={(channel) => updateValue('workoutPlanExpiringChannel', channel)}
      />
      <NotificationRow
        title="Avaliações pendentes"
        description="Lembre-se das avaliações que ainda precisam ser concluídas."
        name="pendingAssessment"
        enabled={values.pendingAssessmentEnabled}
        onEnabledChange={(enabled) => updateValue('pendingAssessmentEnabled', enabled)}
        daysLabel="Dias sem avaliação"
        daysName="pendingAssessmentStaleAfterDays"
        days={values.pendingAssessmentStaleAfterDays}
        daysMax={NOTIFICATION_DAY_LIMITS.pendingAssessmentStaleAfterDays}
        daysError={state?.fieldErrors?.pendingAssessmentStaleAfterDays}
        onDaysChange={(days) => updateValue('pendingAssessmentStaleAfterDays', days)}
        channel={values.pendingAssessmentChannel}
        channelError={state?.fieldErrors?.pendingAssessmentChannel}
        onChannelChange={(channel) => updateValue('pendingAssessmentChannel', channel)}
      />
      <NotificationRow
        title="Novos cadastros de alunos"
        description="Seja avisado quando um aluno concluir o próprio cadastro."
        name="newStudentRegistration"
        enabled={values.newStudentRegistrationEnabled}
        onEnabledChange={(enabled) => updateValue('newStudentRegistrationEnabled', enabled)}
        channel={values.newStudentRegistrationChannel}
        channelError={state?.fieldErrors?.newStudentRegistrationChannel}
        onChannelChange={(channel) => updateValue('newStudentRegistrationChannel', channel)}
      />

      {state?.error && (
        <p role="alert" className="pb-4 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.success && (
        <output className="pb-4 text-sm text-success">Preferências salvas.</output>
      )}
      <div className="flex justify-end py-5">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar preferências'}
        </Button>
      </div>
    </form>
  );
}

function NotificationRow({
  title,
  description,
  name,
  enabled,
  onEnabledChange,
  daysLabel,
  daysName,
  days,
  daysMax,
  daysError,
  onDaysChange,
  channel,
  channelError,
  onChannelChange,
}: {
  title: string;
  description: string;
  name: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  daysLabel?: string;
  daysName?: string;
  days?: string;
  daysMax?: number;
  daysError?: string;
  onDaysChange?: (days: string) => void;
  channel: NotificationChannel;
  channelError?: string;
  onChannelChange: (channel: NotificationChannel) => void;
}) {
  const titleId = `${name}-title`;
  const toggleLabel = title;
  const channelName = `${name}Channel`;
  const channelErrorId = `${channelName}-error`;
  return (
    <fieldset className="border-b border-border py-5 last:border-0">
      <legend className="sr-only">{title}</legend>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id={titleId} className="font-display text-sm font-semibold">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            {daysLabel && daysName && (
              <div>
                <Label htmlFor={daysName} className="text-xs">
                  {daysLabel}
                </Label>
                <Input
                  id={daysName}
                  name={daysName}
                  type="number"
                  min="1"
                  max={daysMax}
                  step="1"
                  required
                  value={days ?? ''}
                  onChange={(event) => onDaysChange?.(event.target.value)}
                  aria-invalid={daysError ? true : undefined}
                  aria-describedby={daysError ? `${daysName}-error` : undefined}
                  className="mt-1 h-9 w-24"
                />
                {daysError && (
                  <p id={`${daysName}-error`} className="mt-1 text-xs text-destructive">
                    {daysError}
                  </p>
                )}
              </div>
            )}
            <div>
              <Label htmlFor={channelName} className="text-xs">
                Canal
              </Label>
              <select
                id={channelName}
                name={channelName}
                required
                value={channel}
                onChange={(event) => onChannelChange(event.target.value as NotificationChannel)}
                aria-invalid={channelError ? true : undefined}
                aria-describedby={channelError ? channelErrorId : undefined}
                aria-label={`Canal dos ${title.toLocaleLowerCase('pt-BR').replace(' dos alunos', '')}`}
                className="mt-1 h-9 rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="email">E-mail</option>
                <option value="push">Push</option>
                <option value="both">E-mail e push</option>
              </select>
              {channelError && (
                <p id={channelErrorId} className="mt-1 text-xs text-destructive">
                  {channelError}
                </p>
              )}
            </div>
          </div>
        </div>
        <label className="inline-flex shrink-0 items-center gap-2 text-sm font-medium">
          <input
            name={`${name}Enabled`}
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
            aria-labelledby={titleId}
            aria-label={toggleLabel}
            className="size-4 accent-primary"
          />
          Ativar
        </label>
      </div>
    </fieldset>
  );
}
