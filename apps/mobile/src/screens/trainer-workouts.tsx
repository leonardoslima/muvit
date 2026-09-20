import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TrainerStudent } from '../application/trainer/trainer-data';
import {
  type TrainerWorkoutPlanSummary,
  listTrainerWorkoutPlans,
} from '../application/workouts/trainer-workout-data';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { InlineMessage } from '../components/ui/inline-message';
import { ContextualHeader, Screen } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { WorkoutPlanListItem } from '../components/workouts/workout-plan-list-item';
import { ApiError } from '../lib/api';
import { colors, radii, spacing, typography } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerWorkoutsScreen() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const student = studentId
    ? queryClient.getQueryData<Pick<TrainerStudent, 'name'>>(['trainer', 'student', studentId])
    : undefined;
  const studentName = student?.name.trim() || undefined;
  const query = useQuery({
    enabled: Boolean(studentId),
    queryKey: ['trainer', 'workouts', studentId],
    queryFn: ({ signal }) => {
      if (!studentId) throw new Error('Aluno inválido.');
      return listTrainerWorkoutPlans(api, studentId, signal);
    },
  });

  function returnToStudent(): void {
    if (!studentId) {
      router.dismissTo('/trainer/students');
      return;
    }
    router.dismissTo(`/trainer/students/${studentId}`);
  }

  function openWorkout(planId: string): void {
    if (!studentId || query.isFetching) return;
    router.push({
      pathname: '/trainer/students/[studentId]/workouts/[planId]',
      params: { studentId, planId },
    });
  }

  function openNewWorkout(): void {
    if (!studentId || query.isFetching) return;
    router.push({
      pathname: '/trainer/students/[studentId]/workouts/new',
      params: { studentId },
    });
  }

  if (!studentId) {
    return (
      <Screen scroll contentContainerStyle={styles.stateContent}>
        <WorkoutBackLink
          headerTestID="trainer-workouts-header"
          label="Alunos"
          onPress={returnToStudent}
          title="Alunos"
        />
        <WorkoutStateCard
          actionLabel="Voltar para alunos"
          description="Não foi possível identificar o aluno solicitado."
          iconName="alert-circle-outline"
          iconTestID="trainer-workouts-invalid-icon"
          onAction={returnToStudent}
          title="Aluno inválido"
          testID="trainer-workouts-invalid-state"
        />
      </Screen>
    );
  }

  if (query.isPending) {
    return (
      <Screen scroll contentContainerStyle={styles.stateContent}>
        <WorkoutBackLink
          headerTestID="trainer-workouts-header"
          label="Voltar para aluno"
          onPress={returnToStudent}
          title="Treinos"
        />
        <StatePanel
          description="Estamos carregando os treinos deste aluno."
          title="Carregando treinos"
          tone="loading"
        />
      </Screen>
    );
  }

  const isNotFound = query.error instanceof ApiError && query.error.status === 404;
  if (isNotFound) {
    return (
      <Screen scroll contentContainerStyle={styles.stateContent}>
        <WorkoutBackLink
          headerTestID="trainer-workouts-header"
          label="Voltar para aluno"
          onPress={returnToStudent}
          title="Treinos"
        />
        <WorkoutStateCard
          actionLabel="Voltar para aluno"
          description="Estes treinos não estão disponíveis para sua conta."
          iconName="alert-circle-outline"
          iconTestID="trainer-workouts-not-found-icon"
          onAction={returnToStudent}
          title="Treinos não encontrados"
          testID="trainer-workouts-not-found-state"
        />
      </Screen>
    );
  }

  const hasData = Boolean(query.data);
  if (query.isError && !hasData) {
    return (
      <Screen scroll contentContainerStyle={styles.stateContent}>
        <WorkoutBackLink
          headerTestID="trainer-workouts-header"
          label="Voltar para aluno"
          onPress={returnToStudent}
          title="Treinos"
        />
        <WorkoutStateCard
          actionDisabled={query.isFetching}
          actionLabel="Tentar novamente"
          actionVariant="primary"
          description="Verifique sua conexão e tente novamente."
          iconName="cloud-offline-outline"
          iconTestID="trainer-workouts-error-icon"
          onAction={() => void query.refetch()}
          title="Não foi possível carregar os treinos"
          testID="trainer-workouts-error-state"
        />
      </Screen>
    );
  }

  const plans: TrainerWorkoutPlanSummary[] = query.data?.items ?? [];
  const isEmpty = hasData && plans.length === 0;
  const hasRefreshError = query.isRefetchError;

  if (isEmpty) {
    return (
      <Screen scroll contentContainerStyle={styles.stateContent}>
        <WorkoutBackLink
          actionTestID="trainer-workouts-header-action"
          headerTestID="trainer-workouts-header"
          label="Voltar para aluno"
          onPress={returnToStudent}
          testID="trainer-workouts-back-icon"
          title="Treinos"
        />
        <WorkoutStateCard
          description="Os planos atribuídos aparecerão aqui quando estiverem disponíveis."
          iconName="barbell-outline"
          iconTestID="trainer-workouts-empty-icon"
          testID="trainer-workouts-empty-state"
          title="Nenhum treino disponível para este aluno."
        />
        <AppButton disabled={query.isFetching} label="Novo treino" onPress={openNewWorkout} />
        {hasRefreshError ? (
          <InlineMessage message="Não foi possível atualizar os treinos." tone="error" />
        ) : null}
        <AppButton
          disabled={query.isFetching}
          label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
          onPress={() => void query.refetch()}
          variant="secondary"
        />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <WorkoutBackLink
        actionTestID="trainer-workouts-header-action"
        headerTestID="trainer-workouts-header"
        label="Voltar para aluno"
        onPress={returnToStudent}
        testID="trainer-workouts-back-icon"
        title={studentName ?? 'Aluno'}
      />
      <View style={styles.introduction}>
        <Text style={styles.title}>Treinos</Text>
        <Text style={styles.subtitle}>
          {studentName
            ? `Planos de ${studentName} para consulta e acompanhamento.`
            : 'Planos deste aluno para consulta e acompanhamento.'}
        </Text>
      </View>
      <View style={styles.plans}>
        {plans.map((plan) => (
          <WorkoutPlanListItem key={plan.id} onPress={() => openWorkout(plan.id)} plan={plan} />
        ))}
      </View>

      <AppButton disabled={query.isFetching} label="Novo treino" onPress={openNewWorkout} />

      {hasRefreshError ? (
        <InlineMessage message="Não foi possível atualizar os treinos." tone="error" />
      ) : null}

      <AppButton
        disabled={query.isFetching}
        label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
        onPress={() => void query.refetch()}
        variant="secondary"
      />
    </Screen>
  );
}

type WorkoutStateCardProps = {
  actionDisabled?: boolean;
  actionLabel?: string;
  actionVariant?: 'primary' | 'secondary';
  description: string;
  iconName: ComponentProps<typeof Ionicons>['name'];
  iconTestID: string;
  onAction?: () => void;
  testID: string;
  title: string;
};

type WorkoutBackLinkProps = {
  actionTestID?: string;
  headerTestID?: string;
  label: string;
  onPress: () => void;
  testID?: string;
  titleTestID?: string;
  title: string;
};

function WorkoutBackLink({
  actionTestID,
  headerTestID,
  label,
  onPress,
  testID,
  title,
  titleTestID,
}: WorkoutBackLinkProps) {
  return (
    <ContextualHeader
      action={
        <View>
          <Ionicons
            accessible={false}
            color={colors.muted}
            name="ellipsis-horizontal"
            size={20}
            testID={actionTestID}
          />
        </View>
      }
      backAccessibilityLabel={label}
      backIcon={
        <View testID={testID ? `${testID}-control` : undefined}>
          <Ionicons
            accessible={false}
            color={colors.ink}
            name="arrow-back"
            size={20}
            testID={testID}
          />
        </View>
      }
      backTestID={testID ? `${testID}-button` : undefined}
      onBack={onPress}
      testID={headerTestID}
      title={title}
      titleTestID={titleTestID}
    />
  );
}

function WorkoutStateCard({
  actionDisabled = false,
  actionLabel,
  actionVariant = 'secondary',
  description,
  iconName,
  iconTestID,
  onAction,
  testID,
  title,
}: WorkoutStateCardProps) {
  return (
    <Card style={styles.stateCard} testID={testID}>
      <View style={styles.stateIcon} testID={`${iconTestID}-surface`}>
        <Ionicons color="#3498DB" name={iconName} size={24} testID={iconTestID} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {actionLabel && onAction ? (
        <View style={styles.stateAction} testID={`${testID}-action`}>
          <AppButton
            disabled={actionDisabled}
            label={actionLabel}
            onPress={onAction}
            trailingIcon={
              actionVariant === 'primary' ? (
                <Ionicons
                  accessible={false}
                  color={colors.ink}
                  name="refresh-outline"
                  size={18}
                  testID={`${iconTestID}-retry-icon`}
                />
              ) : undefined
            }
            variant={actionVariant}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  introduction: {
    gap: spacing.xs,
  },
  plans: {
    gap: spacing.md,
  },
  stateContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.subtitle.fontFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.title.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 31,
  },
  stateAction: {
    width: '100%',
  },
  stateCard: {
    alignItems: 'center',
    borderRadius: radii.md,
    gap: spacing.md,
    padding: spacing.xxl,
  },
  stateDescription: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  stateTitle: {
    color: colors.ink,
    fontFamily: typography.title.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
    textAlign: 'center',
  },
});
