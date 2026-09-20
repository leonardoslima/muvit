import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TrainerStudent } from '../application/trainer/trainer-data';
import { getTrainerWorkoutPlan } from '../application/workouts/trainer-workout-data';
import { AppButton } from '../components/ui/button';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { WorkoutDayCard } from '../components/workouts/workout-day-card';
import { WorkoutStatusBadge } from '../components/workouts/workout-status-badge';
import { ApiError } from '../lib/api';
import { colors, radii, sharedStyles, spacing, typography } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerWorkoutDetailScreen() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    studentId?: string | string[];
    planId?: string | string[];
  }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const planId = Array.isArray(params.planId) ? params.planId[0] : params.planId;
  const student = studentId
    ? queryClient.getQueryData<Pick<TrainerStudent, 'name'>>(['trainer', 'student', studentId])
    : undefined;
  const studentName = student?.name.trim() || undefined;
  const query = useQuery({
    enabled: Boolean(studentId && planId),
    queryKey: ['trainer', 'workout', planId],
    queryFn: ({ signal }) => {
      if (!planId) throw new Error('Treino inválido.');
      return getTrainerWorkoutPlan(api, planId, signal);
    },
  });

  function returnToWorkouts(): void {
    if (!studentId) {
      router.dismissTo('/trainer/students');
      return;
    }
    router.dismissTo(`/trainer/students/${studentId}/workouts`);
  }

  function openEditor(): void {
    if (!studentId || !planId || query.isFetching) return;
    router.push({
      pathname: '/trainer/students/[studentId]/workouts/[planId]/edit',
      params: { studentId, planId },
    });
  }

  if (!studentId || !planId) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para treinos"
          description="Não foi possível identificar o treino solicitado."
          onAction={returnToWorkouts}
          title="Treino inválido"
          tone="error"
        />
      </Screen>
    );
  }

  if (query.isPending) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          description="Estamos carregando a estrutura deste treino."
          title="Carregando treino"
          tone="loading"
        />
      </Screen>
    );
  }

  const isNotFound = query.error instanceof ApiError && query.error.status === 404;
  if (isNotFound) {
    return (
      <Screen style={styles.centeredState}>
        <View testID="trainer-workout-detail-error-state">
          <StatePanel
            actionLabel="Voltar para treinos"
            description="Este treino não está disponível para sua conta."
            onAction={returnToWorkouts}
            title="Treino não encontrado"
            tone="error"
          />
        </View>
      </Screen>
    );
  }

  if (query.isError && !query.data) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionDisabled={query.isFetching}
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void query.refetch()}
          title="Não foi possível carregar o treino"
          tone="error"
        />
      </Screen>
    );
  }

  const plan = query.data;
  if (!plan) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para treinos"
          description="Este treino não está disponível para sua conta."
          onAction={returnToWorkouts}
          title="Treino não encontrado"
          tone="error"
        />
      </Screen>
    );
  }

  if (plan.studentId !== studentId) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para treinos"
          description="Este treino não pertence ao aluno aberto neste contexto."
          onAction={returnToWorkouts}
          title="Treino indisponível"
          tone="error"
        />
      </Screen>
    );
  }

  const period = formatWorkoutPeriod(plan.startDate, plan.endDate);
  const notes = plan.notes?.trim();

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.backHeader}>
        <Pressable
          accessible
          accessibilityLabel="Voltar para treinos"
          accessibilityRole="button"
          onPress={returnToWorkouts}
          style={styles.backButton}
        >
          <View style={styles.backControl} testID="trainer-workout-detail-back-control">
            <Ionicons
              accessible={false}
              color={colors.ink}
              name="arrow-back"
              size={20}
              testID="trainer-workout-detail-back-icon"
            />
          </View>
          <Text testID="trainer-workout-detail-back-title" style={styles.backTitle}>
            {plan.name}
          </Text>
        </Pressable>
        <View style={styles.headerAction}>
          <Ionicons
            accessible={false}
            color={colors.muted}
            name="ellipsis-horizontal"
            size={20}
            testID="trainer-workout-detail-header-action"
          />
        </View>
      </View>
      <View style={styles.planIntro} testID="trainer-workout-detail-plan-intro">
        <View style={styles.planHeading} testID="trainer-workout-detail-plan-heading">
          <Text style={styles.planTitle}>{plan.name}</Text>
          <WorkoutStatusBadge status={plan.status} />
        </View>
        <Text style={styles.planSubtitle}>
          {studentName
            ? `Plano atual de ${studentName} · consulta do treinador`
            : 'Plano de treino para consulta do treinador.'}
        </Text>
        {period ? <Text style={styles.planMeta}>{period}</Text> : null}
        {notes ? <Text style={styles.planMeta}>{notes}</Text> : null}
      </View>

      {plan.days.map((day) => (
        <WorkoutDayCard day={day} key={day.id} />
      ))}

      {query.isRefetchError ? (
        <InlineMessage message="Não foi possível atualizar o treino." tone="error" />
      ) : null}

      <AppButton
        disabled={query.isRefetching}
        label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
        onPress={() => void query.refetch()}
        variant="secondary"
      />
      {plan.status !== 'archived' ? (
        <AppButton disabled={query.isFetching} label="Editar treino" onPress={openEditor} />
      ) : null}
    </Screen>
  );
}

function formatWorkoutPeriod(startDate: string | null, endDate: string | null): string | undefined {
  if (startDate && endDate) {
    return `${formatDate(startDate)} — ${formatDate(endDate)}`;
  }
  if (startDate) return `A partir de ${formatDate(startDate)}`;
  if (endDate) return `Até ${formatDate(endDate)}`;
  return undefined;
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
  backHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
  },
  backControl: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backTitle: {
    color: colors.ink,
    fontFamily: typography.title.fontFamily,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  headerAction: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  centeredState: {
    justifyContent: 'center',
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  planHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  planIntro: {
    gap: 6,
  },
  planMeta: {
    ...sharedStyles.subtitle,
    fontSize: 12,
    lineHeight: 15,
  },
  planSubtitle: {
    color: colors.muted,
    fontFamily: typography.subtitle.fontFamily,
    fontSize: 12,
    lineHeight: 15,
  },
  planTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.title.fontFamily,
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 32,
  },
});
