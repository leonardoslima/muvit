import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';
import { mobileRoutes } from '../application/navigation/role-navigation';
import { adjustSetValue } from '../application/workouts/guided-session';
import { BottomSheet } from '../components/ui/bottom-sheet';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { authClient } from '../lib/auth-client';
import { colors, controlSizes, radii, sharedStyles, spacing, typography } from '../lib/styles';
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
        <SessionHeader
          disabled={controller.busy}
          onBack={() => router.back()}
          showBack={session.phase !== 'rest'}
          title={
            session.phase === 'summary' || !isResumedSession ? day.label : 'Treino em andamento'
          }
        />

        {session.phase === 'set' || session.phase === 'ready-to-finish' ? (
          <SessionProgress
            currentExerciseIndex={session.currentExerciseIndex}
            exerciseCount={day.exercises.length}
          />
        ) : null}

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
            currentExercise={currentExercise}
            nextSetNumber={session.currentSetIndex + 2}
            restEndsAtMs={session.restEndsAtMs}
            onAddTime={() => void controller.addRestTime()}
            onExit={() => setExitVisible(true)}
            onSkip={() => void controller.skipRest()}
            busy={controller.busy}
          />
        ) : null}

        {session.phase === 'exercise-complete' ? (
          <ExerciseCompleteView
            completedSetCount={
              session.sets.filter(
                (set) => set.workoutExerciseId === currentExercise?.id && set.completed,
              ).length
            }
            exerciseName={currentExercise?.exercise.name ?? 'Exercício'}
            onContinue={() => void controller.continueAfterExercise()}
            busy={controller.busy}
          />
        ) : null}

        {session.phase === 'ready-to-finish' ? (
          <ReadyToFinishView
            currentExercise={currentExercise}
            currentSet={currentSet}
            lastCompletedSet={lastCompletedSet}
            onFinish={() => void controller.finishWorkout()}
            setNumber={session.currentSetIndex + 1}
            busy={controller.busy}
          />
        ) : null}

        {session.phase === 'summary' && controller.summary ? (
          <SummaryView
            busy={controller.busy}
            queued={controller.queued}
            summary={controller.summary}
            workoutName={day.label}
            onBackHome={() => router.replace(mobileRoutes.studentHome)}
          />
        ) : null}
      </Screen>

      <ExitSessionModal
        currentExerciseName={currentExercise?.exercise.name}
        currentSetTotal={currentExercise?.sets}
        currentSetNumber={session.currentSetIndex + 1}
        workoutName={day.label}
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

function SessionHeader({
  disabled,
  onBack,
  showBack,
  title,
}: {
  disabled: boolean;
  onBack: () => void;
  showBack: boolean;
  title: string;
}) {
  return (
    <View style={styles.sessionHeader} testID="session-header">
      <View style={styles.sessionHeaderLead}>
        {showBack ? (
          <Pressable
            accessible
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={disabled ? undefined : onBack}
            style={({ pressed }) => [
              styles.sessionHeaderBack,
              disabled ? { opacity: 0.5 } : null,
              pressed && !disabled ? { opacity: 0.8 } : null,
            ]}
            testID="session-header-back"
          >
            <Ionicons color={colors.ink} name="arrow-back" size={20} />
          </Pressable>
        ) : null}
        <Text
          accessibilityRole="header"
          ellipsizeMode="tail"
          numberOfLines={1}
          style={styles.sessionHeaderTitle}
          testID="session-header-title"
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

function SessionProgress({
  currentExerciseIndex,
  exerciseCount,
}: {
  currentExerciseIndex: number;
  exerciseCount: number;
}) {
  const currentExerciseNumber = Math.min(exerciseCount, Math.max(1, currentExerciseIndex + 1));
  const progressPercent =
    exerciseCount > 0 ? Math.round((currentExerciseNumber / exerciseCount) * 100) : 0;

  return (
    <View
      accessibilityLabel={`Progresso do treino: exercício ${currentExerciseNumber} de ${exerciseCount}, ${progressPercent}%`}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: progressPercent }}
      style={styles.progress}
      testID="session-progress"
    >
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>
          Exercício {currentExerciseNumber} de {exerciseCount}
        </Text>
        <Text style={styles.progressValue}>{progressPercent}%</Text>
      </View>
      <View style={styles.progressTrack} testID="session-progress-track">
        <View
          style={[styles.progressFill, { width: `${progressPercent}%` }]}
          testID="session-progress-fill"
        />
      </View>
    </View>
  );
}

function SummaryMetricRow({
  icon,
  label,
  testID,
  value,
}: {
  icon: 'barbell-outline' | 'cube-outline' | 'list-outline' | 'time-outline';
  label: string;
  testID: string;
  value: string;
}) {
  return (
    <View style={styles.summaryMetricRow} testID={testID}>
      <Ionicons color={colors.muted} name={icon} size={18} />
      <Text style={styles.summaryMetricLabel}>{label}</Text>
      <Text style={styles.summaryMetricValue}>{value}</Text>
    </View>
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
    <View style={styles.currentSetSection}>
      <Text style={styles.exerciseTitle}>{currentExercise.exercise.name}</Text>
      <Text style={[styles.exercisePrescription, styles.currentSetPrescription]}>
        {currentExercise.sets} séries · {currentExercise.reps} reps
      </Text>
      <View
        style={[styles.currentSetBadge, styles.currentSetBadgeSpacing]}
        testID="current-set-badge"
      >
        <Text style={styles.currentSetBadgeText}>
          Série {setNumber} de {currentExercise.sets}
        </Text>
      </View>
      <SetFields
        currentSet={currentSet}
        editable={!busy}
        onChangeLoad={onChangeLoad}
        onChangeReps={onChangeReps}
        testID="current-set-fields"
      />
      {lastCompletedSet ? (
        <Card style={styles.previousSetCard} testID="previous-set-card">
          <View style={styles.previousSetInfo}>
            <Text style={styles.previousSetTitle}>Última série</Text>
            <Text style={styles.previousSetValue}>
              {lastCompletedSet.loadKg || '—'} kg × {lastCompletedSet.repsDone || '—'} reps
            </Text>
          </View>
          <Ionicons color={colors.primaryText} name="checkmark-circle-outline" size={22} />
        </Card>
      ) : null}
      <Text style={styles.currentSetHint}>Registre o que você fez antes de avançar.</Text>
      <View style={styles.currentSetAction}>
        <AppButton
          disabled={busy}
          label="Concluir série"
          onPress={onComplete}
          trailingIcon={<Ionicons color={colors.ink} name="checkmark" size={18} />}
        />
      </View>
    </View>
  );
}

function SetFields({
  currentSet,
  editable,
  onChangeLoad,
  onChangeReps,
  testID,
}: {
  currentSet: { loadKg: string; repsDone: string };
  editable: boolean;
  onChangeLoad: (value: string) => void;
  onChangeReps: (value: string) => void;
  testID: string;
}) {
  return (
    <View style={styles.fieldsRow} testID={testID}>
      <SetControl
        accessibilityHint="Informe a carga usada no exercício"
        accessibilityLabel="Carga utilizada"
        controlName="carga"
        editable={editable}
        keyboardType="decimal-pad"
        label="CARGA (kg)"
        onChangeText={onChangeLoad}
        testID="set-control-load"
        value={currentSet.loadKg}
      />
      <SetControl
        accessibilityHint="Informe a quantidade de repetições realizadas"
        accessibilityLabel="Repetições realizadas"
        controlName="repetições"
        editable={editable}
        keyboardType="number-pad"
        label="REPETIÇÕES"
        onChangeText={onChangeReps}
        testID="set-control-reps"
        value={currentSet.repsDone}
      />
    </View>
  );
}

function SetControl({
  accessibilityHint,
  accessibilityLabel,
  controlName,
  editable,
  keyboardType,
  label,
  onChangeText,
  testID,
  value,
}: {
  accessibilityHint: string;
  accessibilityLabel: string;
  controlName: string;
  editable: boolean;
  keyboardType: TextInputProps['keyboardType'];
  label: string;
  onChangeText: (value: string) => void;
  testID: string;
  value: string;
}) {
  const decrease = () => onChangeText(adjustSetValue(value, -1));
  const increase = () => onChangeText(adjustSetValue(value, 1));

  return (
    <Card style={styles.setControl} testID={testID}>
      <Text style={styles.setControlLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          accessible
          accessibilityLabel={`Diminuir ${controlName}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: !editable }}
          disabled={!editable}
          onPress={decrease}
          style={({ pressed }) => [
            styles.stepperButton,
            !editable ? { opacity: 0.5 } : null,
            pressed && editable ? { opacity: 0.8 } : null,
          ]}
          testID={`${testID}-minus`}
        >
          <Ionicons color={colors.primaryText} name="remove" size={18} />
        </Pressable>
        <TextInput
          accessibilityHint={accessibilityHint}
          accessibilityLabel={accessibilityLabel}
          editable={editable}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          style={styles.stepperInput}
          testID={`${testID}-value`}
          value={value}
        />
        <Pressable
          accessible
          accessibilityLabel={`Aumentar ${controlName}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: !editable }}
          disabled={!editable}
          onPress={increase}
          style={({ pressed }) => [
            styles.stepperButton,
            !editable ? { opacity: 0.5 } : null,
            pressed && editable ? { opacity: 0.8 } : null,
          ]}
          testID={`${testID}-plus`}
        >
          <Ionicons color={colors.primaryText} name="add" size={18} />
        </Pressable>
      </View>
    </Card>
  );
}

function RestView({
  currentExercise,
  nextSetNumber,
  onAddTime,
  onExit,
  onSkip,
  restEndsAtMs,
  busy,
}: {
  currentExercise: WorkoutDay['exercises'][number] | undefined;
  nextSetNumber: number;
  onAddTime: () => void;
  onExit: () => void;
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
  const restExpired = restEndsAtMs !== null && remainingSeconds === 0;
  const [expiredPromptVisible, setExpiredPromptVisible] = useState(restExpired);

  useEffect(() => {
    setExpiredPromptVisible(restExpired);
  }, [restExpired]);

  if (expiredPromptVisible) {
    return (
      <RestExpiredView
        busy={busy}
        onContinue={() => {
          onSkip();
        }}
        onExit={() => {
          onExit();
        }}
      />
    );
  }

  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const seconds = String(remainingSeconds % 60).padStart(2, '0');

  return (
    <View style={styles.section}>
      <Card style={styles.restCard} testID="rest-timer-card">
        <Text style={styles.restTitle}>Descanso</Text>
        <Text style={styles.restDescription}>Respire e se prepare para a próxima série.</Text>
        <View style={styles.timerRing} testID="rest-timer-ring">
          <Text accessibilityLabel={`${minutes}:${seconds} restantes`} style={styles.timer}>
            {minutes}:{seconds}
          </Text>
          <Text style={styles.restTimerLabel}>Tempo restante</Text>
        </View>
      </Card>
      {currentExercise ? (
        <Card style={styles.nextSetCard} testID="next-set-card">
          <Text style={styles.nextSetLabel}>PRÓXIMA</Text>
          <Text style={styles.nextSetTitle}>
            Série {nextSetNumber} de {currentExercise.sets}
          </Text>
          <Text style={styles.nextSetPrescription}>{currentExercise.reps} reps</Text>
        </Card>
      ) : null}
      <View style={styles.actionsRow} testID="rest-actions">
        <View style={styles.actionColumn}>
          <AppButton disabled={busy} label="+15 s" onPress={onAddTime} variant="secondary" />
        </View>
        <View style={styles.actionColumn}>
          <AppButton disabled={busy} label="Pular descanso" onPress={onSkip} variant="danger" />
        </View>
      </View>
      <View style={styles.restExitAction} testID="rest-exit-action">
        <AppButton disabled={busy} label="Sair" onPress={onExit} variant="danger" />
      </View>
    </View>
  );
}

function RestExpiredView({
  busy,
  onContinue,
  onExit,
}: {
  busy: boolean;
  onContinue: () => void;
  onExit: () => void;
}) {
  return (
    <View style={[styles.section, styles.restExpiredSection]} testID="rest-expired-state">
      <Card style={styles.restExpiredCard}>
        <Text style={styles.restExpiredTitle}>Descanso encerrado</Text>
        <Text style={styles.restExpiredDescription}>Deseja continuar para a próxima série?</Text>
        <AppButton disabled={busy} label="Continuar" onPress={onContinue} />
        <AppButton disabled={busy} label="Cancelar treino" onPress={onExit} variant="danger" />
      </Card>
    </View>
  );
}

function ExerciseCompleteView({
  completedSetCount,
  exerciseName,
  onContinue,
  busy,
}: {
  completedSetCount: number;
  exerciseName: string;
  onContinue: () => void;
  busy: boolean;
}) {
  return (
    <View style={[styles.section, styles.completionSection]}>
      <View style={styles.successMark} testID="exercise-complete-mark">
        <Ionicons color={colors.ink} name="checkmark" size={34} />
      </View>
      <Text style={[styles.exerciseTitle, styles.centeredText]}>{exerciseName} concluído</Text>
      <Text style={[sharedStyles.subtitle, styles.centeredText]}>
        Séries registradas. Você está avançando bem.
      </Text>
      <Card style={styles.completionCard} testID="exercise-complete-summary">
        <Text style={styles.completionCardTitle}>Resumo do exercício</Text>
        <View style={styles.summaryMetricRow}>
          <Text style={styles.summaryMetricLabel}>Séries registradas</Text>
          <Text style={styles.summaryMetricValue}>{completedSetCount}</Text>
        </View>
        <Text style={styles.completionCardHint}>O próximo exercício já está preparado.</Text>
      </Card>
      <AppButton
        disabled={busy}
        label="Próximo exercício"
        onPress={onContinue}
        trailingIcon={<Ionicons color={colors.ink} name="arrow-forward-outline" size={18} />}
      />
    </View>
  );
}

function ReadyToFinishView({
  currentExercise,
  currentSet,
  lastCompletedSet,
  onFinish,
  setNumber,
  busy,
}: {
  currentExercise: WorkoutDay['exercises'][number] | undefined;
  currentSet: { loadKg: string; repsDone: string } | undefined;
  lastCompletedSet: { loadKg: string; repsDone: string } | undefined;
  onFinish: () => void;
  setNumber: number;
  busy: boolean;
}) {
  if (!currentExercise || !currentSet) return null;

  return (
    <View style={styles.section} testID="ready-to-finish-panel">
      <Text style={styles.exerciseTitle}>{currentExercise.exercise.name}</Text>
      <Text style={styles.exercisePrescription}>
        {currentExercise.sets} séries · {currentExercise.reps} reps
      </Text>
      <View style={styles.currentSetBadge}>
        <Text style={styles.currentSetBadgeText}>
          Série {setNumber} de {currentExercise.sets}
        </Text>
      </View>
      <SetFields
        currentSet={currentSet}
        editable={false}
        onChangeLoad={() => undefined}
        onChangeReps={() => undefined}
        testID="ready-set-fields"
      />
      {lastCompletedSet ? (
        <Card style={styles.previousSetCard} testID="previous-set-card">
          <View style={styles.previousSetInfo}>
            <Text style={styles.previousSetTitle}>Última série</Text>
            <Text style={styles.previousSetValue}>
              {lastCompletedSet.loadKg || '—'} kg × {lastCompletedSet.repsDone || '—'} reps
            </Text>
          </View>
          <Ionicons color={colors.primaryText} name="checkmark-circle-outline" size={22} />
        </Card>
      ) : null}
      <Text style={styles.readyTitle}>Pronto para finalizar</Text>
      <Text style={styles.readyContext}>Última série do treino</Text>
      <Text style={styles.hint}>Confira a última série antes de encerrar o treino.</Text>
      <AppButton
        disabled={busy}
        label="Concluir e finalizar treino"
        onPress={onFinish}
        trailingIcon={<Ionicons color={colors.ink} name="checkmark" size={18} />}
      />
    </View>
  );
}

function SummaryView({
  busy,
  onBackHome,
  queued,
  summary,
  workoutName,
}: {
  busy: boolean;
  onBackHome: () => void;
  queued: boolean;
  summary: NonNullable<ReturnType<typeof useGuidedWorkoutSession>['summary']>;
  workoutName: string;
}) {
  return (
    <View style={[styles.section, styles.summarySection]}>
      <View style={styles.successMark} testID="summary-complete-mark">
        <Ionicons color={colors.ink} name="checkmark" size={34} />
      </View>
      <Text style={styles.summaryTitle}>Treino concluído</Text>
      <Text style={[sharedStyles.subtitle, styles.centeredText]}>
        Parabéns! Você concluiu a sessão.
      </Text>
      <Card style={styles.summaryCard} testID="session-summary-card">
        <Text style={styles.summaryCardTitle}>{workoutName}</Text>
        <Text style={styles.summaryCardSubtitle}>
          {summary.exerciseCount} exercícios concluídos
        </Text>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryMetrics} testID="summary-metrics">
          <SummaryMetricRow
            icon="time-outline"
            label="Duração total"
            testID="summary-metric-duration"
            value={`${summary.durationMin} min`}
          />
          <SummaryMetricRow
            icon="barbell-outline"
            label="Exercícios"
            testID="summary-metric-exercises"
            value={String(summary.exerciseCount)}
          />
          <SummaryMetricRow
            icon="list-outline"
            label="Séries"
            testID="summary-metric-sets"
            value={String(summary.completedSetCount)}
          />
          <SummaryMetricRow
            icon="cube-outline"
            label="Volume total"
            testID="summary-metric-volume"
            value={`${summary.volumeKg} kg`}
          />
        </View>
      </Card>
      <Text style={[styles.hint, styles.centeredText]}>
        {queued ? 'Treino salvo para sincronização' : 'Resumo salvo no seu acompanhamento.'}
      </Text>
      <AppButton disabled={busy} label="Voltar ao início" onPress={onBackHome} />
    </View>
  );
}

function ExitSessionModal({
  currentExerciseName,
  currentSetTotal,
  currentSetNumber,
  onContinue,
  onDiscard,
  onSave,
  storageError,
  busy,
  visible,
  workoutName,
}: {
  currentExerciseName?: string;
  currentSetTotal?: number;
  currentSetNumber: number;
  onContinue: () => void;
  onDiscard: () => Promise<void>;
  onSave: () => Promise<void>;
  storageError: string | null;
  busy: boolean;
  visible: boolean;
  workoutName: string;
}) {
  return (
    <BottomSheet
      onClose={onContinue}
      onRequestClose={() => {
        if (!busy) onContinue();
      }}
      visible={visible}
    >
      <ScreenHeader
        centered
        eyebrow="SAÍDA SEGURA"
        subtitle="Escolha como deseja sair."
        title="Sair da sessão"
      />
      <Card style={styles.exitSummary} testID="exit-session-summary">
        <View style={styles.exitMark}>
          <Ionicons color={colors.primaryText} name="bookmark-outline" size={24} />
        </View>
        <Text style={styles.exitSummaryTitle}>Treino em andamento</Text>
        <Text style={styles.exitSummaryDescription}>
          Use Salvar e sair para tentar continuar daqui depois.
        </Text>
        <View style={styles.exitContextRow} testID="exit-context-row">
          <Ionicons color={colors.primaryText} name="barbell-outline" size={18} />
          <Text style={styles.exitContextText} testID="exit-context-text">
            {workoutName} · {currentExerciseName ?? 'Exercício atual'} · Série {currentSetNumber}
            {currentSetTotal ? ` de ${currentSetTotal}` : ''}
          </Text>
        </View>
      </Card>
      {storageError ? <InlineMessage message={storageError} tone="warning" /> : null}
      <AppButton
        disabled={busy}
        label="Continuar treinando"
        onPress={onContinue}
        trailingIcon={<Ionicons color={colors.ink} name="arrow-forward-outline" size={18} />}
      />
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
        variant="danger"
      />
      <Text style={[styles.hint, styles.centeredText]}>
        Você poderá retomar depois se escolher salvar e sair.
      </Text>
    </BottomSheet>
  );
}

const styles = {
  centeredState: {
    justifyContent: 'center' as const,
    padding: spacing.lg,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  sessionHeader: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    height: 44,
    justifyContent: 'center' as const,
    position: 'relative' as const,
  },
  sessionHeaderLead: {
    alignItems: 'center' as const,
    flex: 1,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    minWidth: 0,
  },
  sessionHeaderBack: {
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center' as const,
    left: 0,
    position: 'absolute' as const,
    width: 44,
  },
  sessionHeaderTitle: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: typography.sessionTitle.fontFamily,
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  section: {
    gap: spacing.md,
  },
  currentSetSection: {
    gap: 0,
    marginTop: spacing.xl,
  },
  progress: {
    gap: spacing.sm,
    height: 72,
  },
  progressHeader: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  progressLabel: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
  },
  progressValue: {
    color: colors.ink,
    fontFamily: typography.bodyStrong.fontFamily,
    fontSize: 13,
  },
  progressTrack: {
    backgroundColor: colors.line,
    borderRadius: radii.pill,
    height: controlSizes.progressTrack,
    overflow: 'hidden' as const,
    width: '100%' as const,
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: controlSizes.progressTrack,
  },
  exerciseTitle: {
    color: colors.ink,
    fontFamily: typography.sessionTitle.fontFamily,
    fontSize: 26,
    fontWeight: '600' as const,
  },
  exercisePrescription: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
  },
  currentSetPrescription: {
    marginTop: spacing.xs,
  },
  currentSetBadge: {
    alignItems: 'center' as const,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.control,
    height: 56,
    justifyContent: 'center' as const,
  },
  currentSetBadgeText: {
    color: colors.primaryText,
    fontFamily: typography.sessionTitle.fontFamily,
    fontSize: 20,
    fontWeight: '600' as const,
  },
  currentSetBadgeSpacing: {
    marginTop: spacing.lg,
  },
  setControl: {
    borderRadius: radii.control,
    gap: 10,
    flex: 1,
    height: 118,
    minWidth: 0,
    padding: spacing.md,
  },
  setControlLabel: {
    color: colors.muted,
    fontFamily: typography.bodyStrong.fontFamily,
    fontSize: 11,
  },
  stepperRow: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    height: 48,
    justifyContent: 'space-between' as const,
  },
  stepperButton: {
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center' as const,
    width: 40,
  },
  stepperInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.sessionTitle.fontFamily,
    fontSize: 24,
    fontWeight: '600' as const,
    height: 48,
    minWidth: 0,
    paddingHorizontal: 0,
    textAlign: 'center' as const,
  },
  previousSetCard: {
    alignItems: 'center' as const,
    borderRadius: radii.control,
    flexDirection: 'row' as const,
    height: 58,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    gap: 0,
    marginTop: spacing.xxl + spacing.sm,
  },
  previousSetInfo: {
    flex: 1,
    gap: 2,
  },
  previousSetTitle: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
  },
  previousSetValue: {
    color: colors.ink,
    fontFamily: typography.bodyStrong.fontFamily,
    fontSize: 14,
  },
  fieldsRow: {
    flexDirection: 'row' as const,
    gap: 22,
    marginTop: spacing.lg,
  },
  currentSetHint: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    marginTop: spacing.xxl + spacing.sm,
  },
  currentSetAction: {
    marginTop: spacing.xxxl * 2 + spacing.xl,
  },
  hint: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
  },
  restCard: {
    alignItems: 'center' as const,
    backgroundColor: colors.ink,
    borderColor: colors.ink,
    minHeight: 396,
    justifyContent: 'center' as const,
    padding: spacing.xl,
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
  timerRing: {
    alignItems: 'center' as const,
    backgroundColor: colors.ink,
    borderColor: colors.primary,
    borderRadius: 95,
    borderWidth: 8,
    height: 190,
    justifyContent: 'center' as const,
    width: 190,
  },
  timer: {
    color: colors.surface,
    ...typography.timer,
  },
  restTimerLabel: {
    color: colors.line,
    ...typography.caption,
  },
  nextSetCard: {
    minHeight: 122,
    padding: spacing.lg,
  },
  nextSetLabel: {
    color: colors.muted,
    ...typography.caption,
    fontFamily: typography.bodyStrong.fontFamily,
    letterSpacing: 1,
  },
  nextSetTitle: {
    color: colors.ink,
    ...typography.exerciseTitle,
  },
  nextSetPrescription: {
    color: colors.muted,
    ...typography.caption,
  },
  actionsRow: {
    alignItems: 'stretch' as const,
    flexDirection: 'row' as const,
    gap: spacing.md,
  },
  actionColumn: {
    flex: 1,
    minWidth: 0,
  },
  restExitAction: {
    marginTop: spacing.sm,
  },
  restExpiredSection: {
    minHeight: 396,
    justifyContent: 'center' as const,
  },
  restExpiredCard: {
    gap: spacing.md,
    padding: spacing.xl,
  },
  restExpiredTitle: {
    color: colors.ink,
    ...typography.title,
    textAlign: 'center' as const,
  },
  restExpiredDescription: {
    color: colors.muted,
    ...typography.body,
    marginBottom: spacing.sm,
    textAlign: 'center' as const,
  },
  successMark: {
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 72,
    justifyContent: 'center' as const,
    width: 72,
  },
  completionSection: {
    gap: spacing.lg,
  },
  centeredText: {
    textAlign: 'center' as const,
  },
  completionCard: {
    minHeight: 140,
  },
  completionCardTitle: {
    color: colors.ink,
    ...typography.bodyStrong,
  },
  completionCardHint: {
    color: colors.muted,
    ...typography.caption,
  },
  summaryMetricRow: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    minHeight: 24,
  },
  summaryMetricLabel: {
    color: colors.muted,
    flex: 1,
    ...typography.caption,
  },
  summaryMetricValue: {
    color: colors.ink,
    ...typography.bodyStrong,
  },
  readyContext: {
    color: colors.muted,
    ...typography.subtitle,
  },
  readyTitle: {
    color: colors.primaryText,
    ...typography.title,
  },
  summarySection: {
    gap: spacing.lg,
  },
  summaryTitle: {
    color: colors.ink,
    ...typography.display,
    textAlign: 'center' as const,
  },
  summaryCard: {
    minHeight: 248,
  },
  summaryCardTitle: {
    color: colors.ink,
    ...typography.exerciseTitle,
  },
  summaryCardSubtitle: {
    color: colors.muted,
    ...typography.caption,
  },
  summaryDivider: {
    backgroundColor: colors.line,
    height: 1,
    width: '100%' as const,
  },
  summaryMetrics: {
    gap: spacing.sm,
  },
  exitSummary: {
    alignItems: 'center' as const,
    gap: spacing.md,
    minHeight: 280,
    padding: spacing.xl,
  },
  exitMark: {
    alignItems: 'center' as const,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 64,
    justifyContent: 'center' as const,
    width: 64,
  },
  exitSummaryTitle: {
    color: colors.ink,
    ...typography.title,
    textAlign: 'center' as const,
  },
  exitSummaryDescription: {
    color: colors.muted,
    ...typography.subtitle,
    textAlign: 'center' as const,
  },
  exitContextRow: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: spacing.sm,
    justifyContent: 'center' as const,
  },
  exitContextText: {
    color: colors.ink,
    flexShrink: 1,
    ...typography.bodyStrong,
    textAlign: 'center' as const,
  },
};
