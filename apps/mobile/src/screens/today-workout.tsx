import { Link, router } from 'expo-router';
import { useRef } from 'react';
import { View } from 'react-native';
import type { GuidedSession } from '../application/workouts/guided-session';
import type { WorkoutDay } from '../application/workouts/today-workout';
import {
  estimateWorkoutDuration,
  getWorkoutDraftProgress,
} from '../application/workouts/today-workout';
import { Screen } from '../components/ui/screen';
import { Button } from '../components/ui/v2/button';
import { Card } from '../components/ui/v2/card';
import { Message } from '../components/ui/v2/message';
import { StatePanel } from '../components/ui/v2/state-panel';
import { Text } from '../components/ui/v2/text';
import { StudentExerciseList } from '../components/workouts/student-exercise-list';
import { authClient } from '../lib/auth-client';
import { colors, controlSizes, spacing } from '../lib/design-system/tokens';
import { muscleGroupLabel } from '../lib/muscle-groups';
import { useTodayWorkout } from '../lib/use-today-workout';

export function TodayWorkoutScreen() {
  const user = authClient.useSession().data?.user;
  const query = useTodayWorkout();
  const retrying = useRef(false);
  const nameParts = user?.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const firstInitial = nameParts[0]?.[0] ?? '';
  const secondInitial =
    nameParts.length > 1 ? (nameParts[nameParts.length - 1]?.[0] ?? '') : (nameParts[0]?.[1] ?? '');
  const initials = `${firstInitial}${secondInitial}`.toLocaleUpperCase('pt-BR') || 'MV';
  const retry = () => {
    if (query.isFetching || retrying.current) return;
    retrying.current = true;
    void query.refetch().finally(() => {
      retrying.current = false;
    });
  };

  if (!query.data && (query.isLoading || query.isFetching || query.isPending)) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        <StudentTodayHeader initials={initials} />
        <View style={styles.stateArea}>
          <StatePanel
            description="Estamos buscando seu treino de hoje."
            kind="loading"
            title="Carregando treino"
          />
        </View>
      </Screen>
    );
  }

  if (!query.data) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        <StudentTodayHeader initials={initials} />
        <View style={styles.stateArea}>
          <StatePanel
            action={{ label: 'Tentar novamente', onPress: retry }}
            description="Verifique sua conexão e tente novamente."
            kind="error"
            title="Não foi possível carregar seu treino"
          />
        </View>
      </Screen>
    );
  }

  const { completedLocal, data, draft, stale } = query.data;
  const hasRefreshError = Boolean(query.error && query.data);

  if (data.status === 'no-active-plan' || data.status === 'no-workout-today') {
    const hasNoPlan = data.status === 'no-active-plan';
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        <StudentTodayHeader initials={initials} />
        {stale ? <OfflineMessage /> : null}
        {hasRefreshError ? (
          <Message
            action={{
              label: query.isFetching ? 'Atualizando…' : 'Tentar novamente',
              onPress: retry,
              disabled: query.isFetching,
              loading: query.isFetching,
            }}
            description="O estado de hoje foi mantido. Tente atualizar novamente."
            title="Não foi possível atualizar"
            variant="error"
          />
        ) : null}
        <View style={styles.stateArea}>
          <StatePanel
            description={
              hasNoPlan
                ? 'Seu professor ainda não publicou um plano de treino.'
                : 'Aproveite para descansar e se preparar para o próximo treino.'
            }
            kind="empty"
            title={hasNoPlan ? 'Sem plano ativo' : 'Hoje é dia de recuperação'}
          />
        </View>
      </Screen>
    );
  }

  const { day, plan } = data;
  const actionLabel = draft ? 'Continuar treino' : 'Iniciar treino';
  const actionHref = draft ? `/session/${day.id}` : `/log/${day.id}`;
  const muscleGroups = [
    ...new Set(day.exercises.map((item) => muscleGroupLabel(item.exercise.muscleGroup))),
  ].join(' · ');

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <StudentTodayHeader initials={initials} />
      {stale ? <OfflineMessage /> : null}
      {hasRefreshError ? (
        <Message
          action={{
            label: query.isFetching ? 'Atualizando…' : 'Tentar novamente',
            onPress: retry,
            disabled: query.isFetching,
            loading: query.isFetching,
          }}
          description="Seu treino continua disponível. Tente atualizar novamente."
          title="Não foi possível atualizar"
          variant="error"
        />
      ) : null}

      <Card className="gap-4 p-5" variant="highlight">
        <Text className="text-v2-sessionSecondary uppercase" variant="caption">
          {completedLocal ? 'CONCLUÍDO' : draft ? 'RETOMAR' : 'HOJE'} · {day.label}
        </Text>
        <Text className="text-v2-sessionText" variant="sectionTitle">
          {completedLocal
            ? 'Treino concluído'
            : draft
              ? 'Treino em andamento'
              : `${plan.name} · ${day.label}`}
        </Text>
        <Text className="text-v2-sessionSecondary" variant="body">
          {muscleGroups}
        </Text>
        <Text className="text-v2-sessionSecondary" variant="support">
          {day.exercises.length} exercícios · {estimateWorkoutDuration(day)} min estimados
        </Text>
        {draft ? <ResumeProgress day={day} session={draft} /> : null}
        {!completedLocal ? (
          <Link asChild href={actionHref}>
            <Button label={actionLabel} />
          </Link>
        ) : null}
      </Card>

      {completedLocal ? (
        <Message
          description="A conclusão está salva neste dispositivo e será sincronizada quando necessário."
          title="Conclusão salva"
          variant="success"
        />
      ) : null}

      <View style={styles.exerciseSection}>
        <Text variant="sectionTitle">Exercícios</Text>
        <StudentExerciseList
          day={day}
          onExercisePress={(exerciseId) => {
            router.push({
              pathname: '/exercise/[dayId]/[exerciseId]',
              params: { dayId: day.id, exerciseId, source: 'today' },
            });
          }}
          variant="preview"
        />
      </View>
    </Screen>
  );
}

function StudentTodayHeader({ initials }: { initials: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Text className="text-v2-brand" variant="sectionTitle">
          muvit
        </Text>
        <View accessibilityLabel={`Perfil do aluno, ${initials}`} style={styles.avatar}>
          <Text className="text-v2-brand" variant="caption">
            {initials}
          </Text>
        </View>
      </View>
      <Text variant="screenTitle">Seu treino de hoje</Text>
      <Text className="text-v2-secondary" variant="body">
        Encontre seu próximo movimento.
      </Text>
    </View>
  );
}

function OfflineMessage() {
  return (
    <Message
      description="Mostrando os dados salvos neste dispositivo."
      title="Treino carregado offline"
      variant="info"
    />
  );
}

function ResumeProgress({ day, session }: { day: WorkoutDay; session: GuidedSession }) {
  const progress = getWorkoutDraftProgress(day, session);

  return (
    <View style={styles.progressContent}>
      <Text className="text-v2-sessionText" variant="label">
        {progress.completedExerciseCount} de {progress.totalExerciseCount} exercícios concluídos
      </Text>
      <View
        accessibilityLabel="Progresso do treino"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: progress.progressPercent }}
        style={styles.progressTrack}
        testID="workout-progress"
      >
        <View style={[styles.progressFill, { width: `${progress.progressPercent}%` }]} />
      </View>
      <Text className="text-v2-sessionSecondary" variant="body">
        {progress.next
          ? `Próximo: ${progress.next.exerciseName} · Série ${progress.next.setNumber} de ${progress.next.totalSets}`
          : 'Treino pronto para concluir'}
      </Text>
    </View>
  );
}

const styles = {
  content: {
    flexGrow: 1,
    gap: spacing.xxl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xxl,
  },
  header: {
    gap: spacing.sm,
  },
  brandRow: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.md,
  },
  avatar: {
    alignItems: 'center' as const,
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: controlSizes.touch / 2,
    borderWidth: 1,
    height: controlSizes.touch,
    justifyContent: 'center' as const,
    width: controlSizes.touch,
  },
  stateArea: {
    flexGrow: 1,
    justifyContent: 'center' as const,
  },
  exerciseSection: {
    gap: spacing.md,
  },
  progressContent: {
    gap: spacing.md,
  },
  progressTrack: {
    backgroundColor: colors.borderOnBrand,
    borderRadius: controlSizes.touch,
    height: spacing.sm,
    overflow: 'hidden' as const,
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: controlSizes.touch,
    height: spacing.sm,
  },
};
