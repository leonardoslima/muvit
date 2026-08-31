import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { mobileRoutes } from '../application/navigation/role-navigation';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Field } from '../components/ui/field';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { authClient } from '../lib/auth-client';
import { colors, radii, sharedStyles, spacing, typography } from '../lib/styles';
import { useApiClient } from '../lib/use-api';
import { type WorkoutDay, useGuidedWorkoutSession } from '../lib/use-guided-workout-session';
import { usePreventRemove } from '../lib/use-prevent-remove';

type NavigationAction = unknown;
type Navigation = {
  dispatch: (action: NavigationAction) => void;
};

export function LogWorkoutScreen() {
  const api = useApiClient();
  const sessionState = authClient.useSession();
  const authUserId = sessionState.data?.user.id;
  const params = useLocalSearchParams<{ dayId: string | string[] }>();
  const dayId = Array.isArray(params.dayId) ? params.dayId[0] : params.dayId;
  const navigation = useNavigation<Navigation>();
  const pendingActionRef = useRef<NavigationAction | null>(null);
  const [exitVisible, setExitVisible] = useState(false);

  const controller = useGuidedWorkoutSession({ api, authUserId, dayId });
  const session = controller.session;
  const day = controller.day;
  const currentExercise = day && session ? day.exercises[session.currentExerciseIndex] : undefined;
  const currentSet = useMemo(() => {
    if (!session || !currentExercise) return undefined;
    return session.sets.filter((set) => set.workoutExerciseId === currentExercise.id)[
      session.currentSetIndex
    ];
  }, [currentExercise, session]);
  const lastCompletedSet = useMemo(() => {
    if (!session || !currentSet) return undefined;
    const currentSetIndex = session.sets.findIndex(
      (set) =>
        set.workoutExerciseId === currentSet.workoutExerciseId &&
        set.setNumber === currentSet.setNumber,
    );
    return session.sets
      .slice(0, currentSetIndex < 0 ? session.sets.length : currentSetIndex)
      .reverse()
      .find((set) => set.workoutExerciseId === currentSet.workoutExerciseId && set.completed);
  }, [currentSet, session]);
  const isResumedSession = session ? session.updatedAtMs > session.startedAtMs : false;

  usePreventRemove(controller.draftActive, ({ data }) => {
    if (controller.busy) return;
    pendingActionRef.current = data.action;
    setExitVisible(true);
  });

  useEffect(() => {
    if (!authUserId || !dayId) {
      pendingActionRef.current = null;
      setExitVisible(false);
      return;
    }
    pendingActionRef.current = null;
    setExitVisible(false);
  }, [authUserId, dayId]);

  if (controller.state === 'loading') {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          description="Estamos buscando os exercícios do treino."
          title="Carregando treino"
          tone="loading"
        />
      </Screen>
    );
  }

  if (controller.state === 'completed') {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          description="A conclusão deste treino já está salva neste aparelho."
          title="Treino concluído"
          tone="empty"
        />
        <AppButton
          label="Voltar ao início"
          onPress={() => router.replace(mobileRoutes.studentHome)}
        />
      </Screen>
    );
  }

  if (controller.state === 'error' || !day || !session) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void controller.retry()}
          title="Treino indisponível"
          tone="error"
        />
      </Screen>
    );
  }

  return (
    <>
      <Screen scroll contentContainerStyle={styles.content}>
        <AppButton
          disabled={controller.busy}
          label="Voltar"
          onPress={() => router.back()}
          variant="secondary"
        />
        <ScreenHeader
          eyebrow={
            session.phase === 'summary' ? 'RESUMO' : isResumedSession ? 'RETOMAR' : 'SESSÃO GUIADA'
          }
          subtitle={`${day.label} · ${day.exercises.length} exercícios`}
          title={
            session.phase === 'summary'
              ? 'Treino concluído'
              : isResumedSession
                ? 'Treino em andamento'
                : day.label
          }
        />

        {controller.storageError ? (
          <InlineMessage message={controller.storageError} tone="warning" />
        ) : null}
        {controller.actionError ? (
          <Card>
            <InlineMessage message={controller.actionError} tone="error" />
            {controller.canRetryFinish ? (
              <AppButton
                disabled={controller.busy}
                label="Tentar novamente"
                onPress={() => void controller.finishWorkout()}
              />
            ) : null}
          </Card>
        ) : null}

        {session.phase === 'set' ? (
          <CurrentSetView
            currentExercise={currentExercise}
            currentSet={currentSet}
            lastCompletedSet={lastCompletedSet}
            onChangeLoad={(loadKg) => void controller.updateSet({ loadKg })}
            onChangeReps={(repsDone) => void controller.updateSet({ repsDone })}
            onComplete={() => void controller.completeSet()}
            setNumber={session.currentSetIndex + 1}
            busy={controller.busy}
          />
        ) : null}

        {session.phase === 'rest' ? (
          <RestView
            restEndsAtMs={session.restEndsAtMs}
            onAddTime={() => void controller.addRestTime()}
            onSkip={() => void controller.skipRest()}
            busy={controller.busy}
          />
        ) : null}

        {session.phase === 'exercise-complete' ? (
          <ExerciseCompleteView
            exerciseName={currentExercise?.exercise.name ?? 'Exercício'}
            onContinue={() => void controller.continueAfterExercise()}
            busy={controller.busy}
          />
        ) : null}

        {session.phase === 'ready-to-finish' ? (
          <ReadyToFinishView
            exerciseName={currentExercise?.exercise.name ?? 'Exercício'}
            onFinish={() => void controller.finishWorkout()}
            busy={controller.busy}
          />
        ) : null}

        {session.phase === 'summary' && controller.summary ? (
          <SummaryView
            busy={controller.busy}
            queued={controller.queued}
            summary={controller.summary}
            onBackHome={() => router.replace(mobileRoutes.studentHome)}
          />
        ) : null}
      </Screen>

      <ExitSessionModal
        currentExerciseName={currentExercise?.exercise.name}
        currentSetNumber={session.currentSetIndex + 1}
        storageError={controller.storageError}
        onContinue={() => {
          pendingActionRef.current = null;
          setExitVisible(false);
        }}
        onDiscard={async () => {
          const discarded = await controller.discard();
          if (!discarded) return;
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          if (action) navigation.dispatch(action);
          else router.replace(mobileRoutes.studentHome);
          setExitVisible(false);
        }}
        onSave={async () => {
          const saved = await controller.saveDraft();
          if (!saved) return;
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          if (action) navigation.dispatch(action);
          else router.replace(mobileRoutes.studentHome);
          setExitVisible(false);
        }}
        busy={controller.busy}
        visible={exitVisible}
      />
    </>
  );
}

function CurrentSetView({
  currentExercise,
  currentSet,
  lastCompletedSet,
  onChangeLoad,
  onChangeReps,
  onComplete,
  setNumber,
  busy,
}: {
  currentExercise: WorkoutDay['exercises'][number] | undefined;
  currentSet: { loadKg: string; repsDone: string } | undefined;
  lastCompletedSet: { loadKg: string; repsDone: string } | undefined;
  onChangeLoad: (value: string) => void;
  onChangeReps: (value: string) => void;
  onComplete: () => void;
  setNumber: number;
  busy: boolean;
}) {
  if (!currentExercise || !currentSet) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.exerciseTitle}>{currentExercise.exercise.name}</Text>
      <Text style={sharedStyles.subtitle}>
        {currentExercise.sets} séries · {currentExercise.reps} reps
      </Text>
      <View style={styles.currentSetBadge}>
        <Text style={styles.currentSetBadgeText}>
          Série {setNumber} de {currentExercise.sets}
        </Text>
      </View>
      {lastCompletedSet ? (
        <Card>
          <Text style={styles.previousSetTitle}>Última série registrada</Text>
          <Text style={sharedStyles.subtitle}>
            {lastCompletedSet.repsDone || '—'} reps · {lastCompletedSet.loadKg || '—'} kg
          </Text>
        </Card>
      ) : null}
      <View style={styles.fieldsRow}>
        <Field
          accessibilityHint="Informe a quantidade de repetições realizadas"
          keyboardType="number-pad"
          label="Repetições realizadas"
          onChangeText={onChangeReps}
          editable={!busy}
          value={currentSet.repsDone}
        />
        <Field
          accessibilityHint="Informe a carga usada no exercício"
          keyboardType="decimal-pad"
          label="Carga utilizada"
          onChangeText={onChangeLoad}
          editable={!busy}
          unit="kg"
          value={currentSet.loadKg}
        />
      </View>
      <Text style={styles.hint}>Registre o que você fez antes de avançar.</Text>
      <AppButton disabled={busy} label="Concluir série" onPress={onComplete} />
    </View>
  );
}

function RestView({
  onAddTime,
  onSkip,
  restEndsAtMs,
  busy,
}: {
  onAddTime: () => void;
  onSkip: () => void;
  restEndsAtMs: number | null;
  busy: boolean;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    const interval = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, []);

  const remainingSeconds = Math.max(0, Math.ceil(((restEndsAtMs ?? nowMs) - nowMs) / 1_000));
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const seconds = String(remainingSeconds % 60).padStart(2, '0');

  return (
    <View style={styles.section}>
      <Card style={styles.restCard}>
        <Text style={styles.restTitle}>Descanso</Text>
        <Text style={styles.restDescription}>Respire e se prepare para a próxima série.</Text>
        <Text accessibilityLiveRegion="polite" style={styles.timer}>
          {minutes}:{seconds}
        </Text>
        <Text style={styles.restDescription}>Tempo restante</Text>
      </Card>
      <View style={styles.actionsRow}>
        <AppButton disabled={busy} label="+15 s" onPress={onAddTime} variant="secondary" />
        <AppButton disabled={busy} label="Pular descanso" onPress={onSkip} variant="secondary" />
      </View>
    </View>
  );
}

function ExerciseCompleteView({
  exerciseName,
  onContinue,
  busy,
}: {
  exerciseName: string;
  onContinue: () => void;
  busy: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.successMark}>✓</Text>
      <Text style={styles.exerciseTitle}>{exerciseName} concluído</Text>
      <Text style={sharedStyles.subtitle}>Séries registradas. Você está avançando bem.</Text>
      <AppButton disabled={busy} label="Próximo exercício" onPress={onContinue} />
    </View>
  );
}

function ReadyToFinishView({
  exerciseName,
  onFinish,
  busy,
}: {
  exerciseName: string;
  onFinish: () => void;
  busy: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.exerciseTitle}>{exerciseName}</Text>
      <Text style={sharedStyles.subtitle}>Última série do treino</Text>
      <Text style={styles.readyTitle}>Pronto para finalizar</Text>
      <AppButton disabled={busy} label="Concluir e finalizar treino" onPress={onFinish} />
    </View>
  );
}

function SummaryView({
  busy,
  onBackHome,
  queued,
  summary,
}: {
  busy: boolean;
  onBackHome: () => void;
  queued: boolean;
  summary: NonNullable<ReturnType<typeof useGuidedWorkoutSession>['summary']>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.successMark}>✓</Text>
      <Text style={styles.summaryTitle}>Treino concluído</Text>
      <Text style={sharedStyles.subtitle}>Parabéns! Você concluiu a sessão.</Text>
      <Card>
        <Text style={styles.metric}>Duração total: {summary.durationMin} min</Text>
        <Text style={styles.metric}>Exercícios: {summary.exerciseCount}</Text>
        <Text style={styles.metric}>Séries: {summary.completedSetCount}</Text>
        <Text style={styles.metric}>Volume total: {summary.volumeKg} kg</Text>
      </Card>
      <Text style={styles.hint}>
        {queued ? 'Treino salvo para sincronização' : 'Resumo salvo no seu acompanhamento.'}
      </Text>
      <AppButton disabled={busy} label="Voltar ao início" onPress={onBackHome} />
    </View>
  );
}

function ExitSessionModal({
  currentExerciseName,
  currentSetNumber,
  onContinue,
  onDiscard,
  onSave,
  storageError,
  busy,
  visible,
}: {
  currentExerciseName?: string;
  currentSetNumber: number;
  onContinue: () => void;
  onDiscard: () => Promise<void>;
  onSave: () => Promise<void>;
  storageError: string | null;
  busy: boolean;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onContinue();
      }}
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSurface}>
          <ScreenHeader
            eyebrow="SAÍDA SEGURA"
            subtitle="Escolha como deseja sair."
            title="Sair da sessão"
          />
          <Card>
            <Text style={styles.metric}>Treino em andamento</Text>
            <Text style={sharedStyles.subtitle}>
              {currentExerciseName ?? 'Exercício atual'} · Série {currentSetNumber}
            </Text>
          </Card>
          {storageError ? <InlineMessage message={storageError} tone="warning" /> : null}
          <AppButton disabled={busy} label="Continuar treinando" onPress={onContinue} />
          <AppButton
            disabled={busy}
            label="Salvar e sair"
            onPress={() => void onSave()}
            variant="secondary"
          />
          <AppButton
            disabled={busy}
            label="Encerrar treino"
            onPress={() => void onDiscard()}
            variant="secondary"
          />
          <Text style={styles.hint}>Você poderá retomar depois se escolher salvar e sair.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  centeredState: {
    justifyContent: 'center' as const,
    padding: spacing.lg,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  section: {
    gap: spacing.md,
  },
  exerciseTitle: {
    color: colors.ink,
    ...typography.sessionTitle,
  },
  currentSetBadge: {
    alignItems: 'center' as const,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  currentSetBadgeText: {
    color: colors.primaryText,
    ...typography.bodyStrong,
    fontSize: typography.subtitle.fontSize,
  },
  previousSetTitle: {
    color: colors.ink,
    ...typography.bodyStrong,
  },
  fieldsRow: {
    flexDirection: 'row' as const,
    gap: spacing.md,
  },
  hint: {
    color: colors.muted,
    ...typography.caption,
  },
  restCard: {
    alignItems: 'center' as const,
    backgroundColor: colors.ink,
    borderColor: colors.ink,
    minHeight: 260,
    justifyContent: 'center' as const,
  },
  restTitle: {
    color: colors.surface,
    ...typography.sessionTitle,
  },
  restDescription: {
    color: colors.line,
    ...typography.caption,
    textAlign: 'center' as const,
  },
  timer: {
    color: colors.surface,
    ...typography.timer,
  },
  actionsRow: {
    flexDirection: 'row' as const,
    gap: spacing.md,
  },
  successMark: {
    alignSelf: 'center' as const,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    color: colors.surface,
    fontSize: 28,
    overflow: 'hidden' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  readyTitle: {
    color: colors.primaryText,
    ...typography.button,
  },
  summaryTitle: {
    color: colors.ink,
    ...typography.display,
    textAlign: 'center' as const,
  },
  metric: {
    color: colors.ink,
    ...typography.bodyStrong,
  },
  modalBackdrop: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  modalSurface: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    gap: spacing.md,
    padding: spacing.xxl,
  },
};
