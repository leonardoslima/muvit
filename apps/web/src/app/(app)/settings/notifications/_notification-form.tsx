'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GetTrainerNotificationPreferencesResponse } from '@/lib/api/types.gen';
import { useActionState } from 'react';
import { type NotificationFormState, updateNotificationPreferencesAction } from './actions';

type Preferences = GetTrainerNotificationPreferencesResponse;

export function NotificationForm({ preferences }: { preferences: Preferences }) {
  const [state, formAction, pending] = useActionState<NotificationFormState, FormData>(
    updateNotificationPreferencesAction,
    null,
  );

  return (
    <form action={formAction} className="max-w-3xl rounded-[12px] bg-card px-5 shadow-card sm:px-6">
      <NotificationRow
        title="Alertas de inatividade dos alunos"
        description="Avise quando um aluno ficar sem registrar treinos."
        name="inactivity"
        enabled={preferences.inactivity.enabled}
        daysLabel="Dias de inatividade"
        daysName="inactivityAfterDays"
        days={preferences.inactivity.afterDays}
        channel={preferences.inactivity.channel}
      />
      <NotificationRow
        title="Planos de treino vencendo"
        description="Receba um lembrete antes de o plano de um aluno expirar."
        name="workoutPlanExpiring"
        enabled={preferences.workoutPlanExpiring.enabled}
        daysLabel="Dias antes do vencimento"
        daysName="workoutPlanExpiringDaysBefore"
        days={preferences.workoutPlanExpiring.daysBefore}
        channel={preferences.workoutPlanExpiring.channel}
      />
      <NotificationRow
        title="Avaliações pendentes"
        description="Lembre-se das avaliações que ainda precisam ser concluídas."
        name="pendingAssessment"
        enabled={preferences.pendingAssessment.enabled}
        daysLabel="Dias sem avaliação"
        daysName="pendingAssessmentStaleAfterDays"
        days={preferences.pendingAssessment.staleAfterDays}
        channel={preferences.pendingAssessment.channel}
      />
      <NotificationRow
        title="Novos cadastros de alunos"
        description="Seja avisado quando um aluno concluir o próprio cadastro."
        name="newStudentRegistration"
        enabled={preferences.newStudentRegistration.enabled}
        channel={preferences.newStudentRegistration.channel}
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
  daysLabel,
  daysName,
  days,
  channel,
}: {
  title: string;
  description: string;
  name: string;
  enabled: boolean;
  daysLabel?: string;
  daysName?: string;
  days?: number;
  channel?: 'email' | 'push' | 'both';
}) {
  const titleId = `${name}-title`;
  const toggleLabel = title;
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
                  defaultValue={days?.toString() ?? ''}
                  className="mt-1 h-9 w-24"
                />
              </div>
            )}
            <div>
              <Label htmlFor={`${name}Channel`} className="text-xs">
                Canal
              </Label>
              <select
                id={`${name}Channel`}
                name={`${name}Channel`}
                defaultValue={channel ?? 'email'}
                aria-label={`Canal dos ${title.toLocaleLowerCase('pt-BR').replace(' dos alunos', '')}`}
                className="mt-1 h-9 rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="email">E-mail</option>
                <option value="push">Push</option>
                <option value="both">E-mail e push</option>
              </select>
            </div>
          </div>
        </div>
        <label className="inline-flex shrink-0 items-center gap-2 text-sm font-medium">
          <input
            name={`${name}Enabled`}
            type="checkbox"
            defaultChecked={enabled}
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
