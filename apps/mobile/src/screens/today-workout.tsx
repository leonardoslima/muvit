import { Link, router } from 'expo-router';
import { ArrowUpRight, Clock3, Dumbbell } from 'lucide-react-native';
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
import { StudentWorkoutEvolution } from '../components/workouts/student-workout-evolution';
import { authClient } from '../lib/auth-client';
import {
  colors,
  controlSizes,
  fontFamilies,
  penTokens,
  spacing,
} from '../lib/design-system/tokens';
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
        <StudentTodayHeader firstName={nameParts[0]} initials={initials} />
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
        <StudentTodayHeader firstName={nameParts[0]} initials={initials} />
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
        <StudentTodayHeader firstName={nameParts[0]} initials={initials} />
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
      <StudentTodayHeader firstName={nameParts[0]} initials={initials} />
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

      <Card className="gap-0 border-0 p-5" style={styles.workoutCard} variant="highlight">
        <Text className="text-v2-primary uppercase" variant="caption">
          {completedLocal ? 'CONCLUÍDO' : draft ? 'RETOMAR' : 'HOJE'} · {day.label}
        </Text>
        <Text className="text-v2-surface" style={styles.workoutTitle} variant="sectionTitle">
          {completedLocal ? 'Treino concluído' : draft ? 'Treino em andamento' : plan.name}
        </Text>
        <Text style={styles.workoutContext}>{muscleGroups}</Text>
        <View style={styles.workoutMetrics}>
          <View style={styles.metric}>
            <Clock3 accessible={false} color={colors.primary} size={penTokens['font/size/17']} />
            <Text style={styles.metricText}>~{estimateWorkoutDuration(day)} min</Text>
          </View>
          <View style={styles.metric}>
            <Dumbbell accessible={false} color={colors.primary} size={penTokens['font/size/17']} />
            <Text style={styles.metricText}>{day.exercises.length} exercícios</Text>
          </View>
        </View>
        {draft ? <ResumeProgress day={day} session={draft} /> : null}
        {!completedLocal ? (
          <View style={styles.workoutAction}>
            <Link asChild href={actionHref}>
              <Button label={actionLabel} labelClassName="px-6 text-[17px]" />
            </Link>
            <View pointerEvents="none" style={styles.actionArrow}>
              <ArrowUpRight accessible={false} color={colors.text} size={controlSizes.icon} />
            </View>
          </View>
        ) : null}
      </Card>

      {completedLocal ? (
        <Message
          description="A conclusão está salva neste dispositivo e será sincronizada quando necessário."
          title="Conclusão salva"
          variant="success"
        />
      ) : null}

      <StudentWorkoutEvolution />
      <View style={styles.exerciseSection}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle} variant="sectionTitle">
            Exercícios de hoje
          </Text>
          <Text className="text-v2-secondary" variant="support">
            {day.exercises.length} exercícios
          </Text>
        </View>
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

function StudentTodayHeader({ firstName, initials }: { firstName?: string; initials: string }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const date = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.brand}>
          <Text className="font-v2-extrabold text-[22px]" variant="sectionTitle">
            muvit
          </Text>
          <View style={styles.brandDot} />
        </View>
        <View accessibilityLabel={`Perfil do aluno, ${initials}`} style={styles.avatar}>
          <Text className="text-[13px]" variant="caption">
            {initials}
          </Text>
        </View>
      </View>
      <View style={styles.heading}>
        <Text className="text-v2-brand uppercase" variant="caption">
          {firstName ? `${greeting}, ${firstName}` : greeting}
        </Text>
        <Text
          accessibilityRole="header"
          className="text-[29px] leading-[34.8px]"
          variant="screenTitle"
        >
          Seu ritmo, seu dia.
        </Text>
        <Text className="text-v2-secondary text-[13px]" variant="body">
          {date.charAt(0).toLocaleUpperCase('pt-BR') + date.slice(1)}
        </Text>
      </View>
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
      <Text className="text-v2-surface" variant="label">
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
      <Text style={{ color: colors.onBrandSecondary }} variant="body">
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
    gap: spacing.xxl,
  },
  heading: {
    gap: spacing.xs,
  },
  brandRow: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    minHeight: controlSizes.touch + spacing.optical,
  },
  brand: {
    alignItems: 'baseline' as const,
    flexDirection: 'row' as const,
    gap: spacing.optical,
  },
  brandDot: {
    backgroundColor: colors.primary,
    borderRadius: spacing.xs,
    height: 7,
    width: 7,
  },
  avatar: {
    alignItems: 'center' as const,
    backgroundColor: colors.subtle,
    borderRadius: penTokens['radius/21'],
    height: penTokens['radius/21'] * 2,
    justifyContent: 'center' as const,
    width: penTokens['radius/21'] * 2,
  },
  workoutCard: {
    backgroundColor: colors.text,
    paddingTop: penTokens['font/size/22'],
    paddingBottom: spacing.md,
  },
  workoutTitle: {
    fontSize: penTokens['font/size/25'],
    lineHeight: penTokens['font/size/25'] * 1.35,
    marginTop: spacing.lg,
  },
  workoutContext: {
    color: colors.onBrandSecondary,
    fontSize: penTokens['font/size/13'],
    lineHeight: penTokens['font/size/13'] * 1.35,
    marginTop: spacing.xs,
  },
  workoutMetrics: {
    alignItems: 'center' as const,
    borderTopColor: colors.borderOnBrand,
    borderTopWidth: 1,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    columnGap: spacing.xxxl,
    rowGap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  metric: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: spacing.sm,
  },
  metricText: {
    color: colors.surface,
    fontSize: penTokens['font/size/13'],
    lineHeight: penTokens['font/size/13'] * 1.4,
    fontFamily: fontFamilies.semibold,
  },
  workoutAction: {
    marginTop: spacing.lg,
  },
  actionArrow: {
    position: 'absolute' as const,
    right: spacing.xl,
    top: 0,
    bottom: 0,
    justifyContent: 'center' as const,
  },
  stateArea: {
    flexGrow: 1,
    justifyContent: 'center' as const,
  },
  exerciseSection: {
    gap: spacing.md,
  },
  sectionHeading: {
    alignItems: 'baseline' as const,
    flexDirection: 'row' as const,
    gap: spacing.md,
  },
  sectionTitle: {
    flex: 1,
  },
  progressContent: {
    gap: spacing.md,
    marginTop: spacing.lg,
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
