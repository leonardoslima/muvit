import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, View, findNodeHandle } from 'react-native';
import { mobileRoutes } from '../application/navigation/role-navigation';
import { selectGuidedSessionView } from '../application/workouts/guided-session-presentation';
import type { getWorkoutDraftProgress } from '../application/workouts/today-workout';
import { Button } from '../components/ui/v2/button';
import { Header } from '../components/ui/v2/header';
import { StatePanel as V2StatePanel } from '../components/ui/v2/state-panel';
import { Text as V2Text } from '../components/ui/v2/text';
import { GuidedSessionContent } from '../components/workouts/guided-session-content';
import {
  GuidedSessionDemonstration,
  type GuidedSessionDemonstrationPhase,
} from '../components/workouts/guided-session-demonstration';
import { GuidedSessionExitSheet } from '../components/workouts/guided-session-exit-sheet';
import { GuidedSessionLayout } from '../components/workouts/guided-session-layout';
import { authClient } from '../lib/auth-client';
import { radii, colors as v2Colors } from '../lib/design-system/tokens';
import { useApiClient } from '../lib/use-api';
import { type WorkoutDay, useGuidedWorkoutSession } from '../lib/use-guided-workout-session';
import { usePreventRemove } from '../lib/use-prevent-remove';

type NavigationAction = unknown;
type Navigation = {
  dispatch: (action: NavigationAction) => void;
};
type DemonstrationContext = {
  authUserId?: string;
  dayId?: string;
  exercise: WorkoutDay['exercises'][number];
  originPhase: GuidedSessionDemonstrationPhase;
  originContext: string;
  restEndsAtMs: number | null;
};

export function LogWorkoutScreen() {
  const api = useApiClient();
  const sessionState = authClient.useSession();
  const authUserId = sessionState.data?.user.id;
  const params = useLocalSearchParams<{ dayId: string | string[] }>();
  const dayId = Array.isArray(params.dayId) ? params.dayId[0] : params.dayId;
  const navigation = useNavigation<Navigation>();
  const pendingActionRef = useRef<NavigationAction | null>(null);
  const demonstrationActionRef = useRef<View>(null);
  const restoreDemonstrationFocusRef = useRef(false);
  const [exitVisible, setExitVisible] = useState(false);
  const [demonstration, setDemonstration] = useState<DemonstrationContext | null>(null);

  const controller = useGuidedWorkoutSession({
    api,
    authUserId,
    dayId,
    deferRestAdvance: exitVisible || Boolean(demonstration),
  });
  const session = controller.session;
  const day = controller.day;
  const selection = day && session ? selectGuidedSessionView(day, session) : null;
  const currentExercise = selection?.currentExercise;
  const isResumedSession = session ? session.updatedAtMs > session.startedAtMs : false;
  const demonstrationExercise =
    demonstration?.originPhase === 'exercise-complete' ? selection?.nextExercise : currentExercise;
  const demonstrationVisible = Boolean(
    demonstration &&
      session &&
      demonstration.authUserId === authUserId &&
      demonstration.dayId === dayId &&
      session.phase === demonstration.originPhase &&
      demonstrationExercise?.id === demonstration.exercise.id,
  );

  const closeDemonstration = () => {
    if (!demonstration) return;
    restoreDemonstrationFocusRef.current = true;
    setDemonstration(null);
  };

  const openDemonstration = (exercise: WorkoutDay['exercises'][number]) => {
    if (
      !session ||
      !dayId ||
      (session.phase !== 'set' && session.phase !== 'rest' && session.phase !== 'exercise-complete')
    ) {
      return;
    }

    const originContext =
      session.phase === 'set'
        ? `Série ${session.currentSetIndex + 1} de ${exercise.sets}`
        : session.phase === 'rest'
          ? `${currentExercise?.exercise.name ?? exercise.exercise.name} · Série ${session.currentSetIndex + 1} concluída`
          : 'Próximo exercício';

    setDemonstration({
      authUserId,
      dayId,
      exercise,
      originPhase: session.phase,
      originContext,
      restEndsAtMs: session.phase === 'rest' ? session.restEndsAtMs : null,
    });
  };

  usePreventRemove(controller.draftActive, ({ data }) => {
    if (controller.busy) return;
    if (demonstrationVisible) {
      closeDemonstration();
      return;
    }
    pendingActionRef.current = data.action;
    setExitVisible(true);
  });

  useEffect(() => {
    if (!authUserId || !dayId) {
      pendingActionRef.current = null;
      setExitVisible(false);
      restoreDemonstrationFocusRef.current = false;
      setDemonstration(null);
      return;
    }
    pendingActionRef.current = null;
    setExitVisible(false);
    restoreDemonstrationFocusRef.current = false;
    setDemonstration(null);
  }, [authUserId, dayId]);

  useEffect(() => {
    if (!demonstration) return;
    if (demonstrationVisible) return;

    restoreDemonstrationFocusRef.current = false;
    setDemonstration(null);
  }, [demonstration, demonstrationVisible]);

  useEffect(() => {
    if (demonstration || !restoreDemonstrationFocusRef.current) return;
    restoreDemonstrationFocusRef.current = false;
    const node = findNodeHandle(demonstrationActionRef.current);
    if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
  }, [demonstration]);

  const requestClose = () => {
    if (demonstrationVisible) {
      closeDemonstration();
      return;
    }
    if (controller.busy) return;
    if (controller.draftActive && !router.canGoBack()) {
      pendingActionRef.current = null;
      setExitVisible(true);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(mobileRoutes.studentHome);
  };

  const leaveAfterExit = () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) navigation.dispatch(action);
    else router.replace(mobileRoutes.studentHome);
  };

  const continueAfterExit = () => {
    if (controller.busy) return;
    pendingActionRef.current = null;
    setExitVisible(false);
  };

  const saveAndExit = async () => {
    if (controller.busy) return;
    const saved = await controller.saveDraft();
    if (!saved) return;
    leaveAfterExit();
    setExitVisible(false);
  };

  const discardAndExit = async () => {
    if (controller.busy) return;
    const discarded = await controller.discard();
    if (!discarded) return;
    leaveAfterExit();
    setExitVisible(false);
  };

  const exitContext = currentExercise
    ? `${currentExercise.exercise.name} · Série ${(session?.currentSetIndex ?? 0) + 1}`
    : 'Treino em andamento';
  const exitSheet = (
    <GuidedSessionExitSheet
      context={exitContext}
      storageError={controller.storageError}
      onContinue={continueAfterExit}
      onDiscard={discardAndExit}
      onSave={saveAndExit}
      busy={controller.busy}
      visible={exitVisible}
    />
  );

  if (controller.state === 'loading') {
    return (
      <>
        <GuidedSessionLayout contentHidden={exitVisible}>
          <SessionHeader busy={controller.busy} onClose={requestClose} title="Sessão guiada" />
          <V2StatePanel
            description="Estamos buscando os exercícios do treino."
            title="Carregando treino"
            kind="loading"
            variant="immersive"
          />
        </GuidedSessionLayout>
        {exitSheet}
      </>
    );
  }

  if (controller.state === 'completed') {
    return (
      <>
        <GuidedSessionLayout contentHidden={exitVisible}>
          <SessionHeader busy={controller.busy} onClose={requestClose} title="Treino concluído" />
          <V2StatePanel
            description="A conclusão deste treino já está salva neste aparelho."
            title="Treino concluído"
            kind="success"
            variant="immersive"
          />
          <Button
            label="Voltar ao início"
            onPress={() => router.replace(mobileRoutes.studentHome)}
          />
        </GuidedSessionLayout>
        {exitSheet}
      </>
    );
  }

  if (controller.state === 'error' || !day || !session || !selection) {
    return (
      <>
        <GuidedSessionLayout contentHidden={exitVisible}>
          <SessionHeader busy={controller.busy} onClose={requestClose} title="Sessão guiada" />
          <V2StatePanel
            action={{
              label: 'Tentar novamente',
              onPress: () => void controller.retry(),
              disabled: controller.busy,
              loading: controller.busy,
            }}
            description="Verifique sua conexão e tente novamente."
            title="Treino indisponível"
            kind="error"
            variant="immersive"
          />
        </GuidedSessionLayout>
        {exitSheet}
      </>
    );
  }

  const progress = selection.progress;

  return (
    <>
      <GuidedSessionLayout
        contentHidden={exitVisible || demonstrationVisible}
        statusBarStyle={demonstrationVisible ? 'dark' : 'light'}
      >
        <SessionHeader
          busy={controller.busy}
          onClose={requestClose}
          progress={progress}
          subtitle={isResumedSession ? 'Treino em andamento' : undefined}
          title={session.phase === 'summary' ? 'Treino concluído' : day.label}
        />

        <GuidedSessionContent
          controller={controller}
          demonstrationActionRef={demonstrationActionRef}
          onBackHome={() => router.replace(mobileRoutes.studentHome)}
          onOpenDemonstration={openDemonstration}
          selection={selection}
        />
      </GuidedSessionLayout>
      {exitSheet}
      {demonstration ? (
        <GuidedSessionDemonstration
          visible={demonstrationVisible}
          authUserId={demonstration.authUserId}
          dayId={demonstration.dayId}
          exercise={demonstration.exercise}
          originPhase={demonstration.originPhase}
          originContext={demonstration.originContext}
          restEndsAtMs={demonstration.restEndsAtMs}
          onClose={closeDemonstration}
        />
      ) : null}
    </>
  );
}

function SessionHeader({
  title,
  subtitle,
  progress,
  busy,
  onClose,
}: {
  title: string;
  subtitle?: string;
  progress?: ReturnType<typeof getWorkoutDraftProgress>;
  busy: boolean;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <View className="gap-5">
      <Header
        title={title}
        variant="session"
        backAction={{ label: 'Fechar sessão', onPress: onClose, disabled: busy }}
      />
      {subtitle ? (
        <V2Text className="text-v2-sessionSecondary" variant="body">
          {subtitle}
        </V2Text>
      ) : null}
      {progress ? (
        <View className="min-h-[48px] gap-3">
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: progress.totalExerciseCount,
              now: progress.completedExerciseCount,
              text: `${progress.completedExerciseCount} de ${progress.totalExerciseCount} exercícios concluídos`,
            }}
            className="h-[6px] overflow-hidden rounded-full bg-v2-sessionBorder"
          >
            <View
              style={{
                width: `${progress.progressPercent}%`,
                height: '100%',
                backgroundColor: v2Colors.primary,
                borderRadius: radii.highlight,
              }}
            />
          </View>
          <V2Text className="font-v2-bold text-v2-primary" variant="body">
            {progress.completedExerciseCount} de {progress.totalExerciseCount} exercícios concluídos
          </V2Text>
        </View>
      ) : null}
    </View>
  );
}
