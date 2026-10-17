import { Play } from 'lucide-react-native';
import { type Ref, useEffect, useState } from 'react';
import { AppState, View, useWindowDimensions } from 'react-native';
import type { GuidedSessionView } from '../../application/workouts/guided-session-presentation';
import { adjustSessionValue } from '../../application/workouts/guided-session-presentation';
import { colors, fontFamilies, penTokens } from '../../lib/design-system/tokens';
import type { GuidedWorkoutController, WorkoutDay } from '../../lib/use-guided-workout-session';
import { Button, Card, Message, NumericField, Text } from '../ui/v2';

export type GuidedSessionContentProps = {
  controller: GuidedWorkoutController;
  selection: GuidedSessionView;
  onOpenDemonstration: (exercise: WorkoutDay['exercises'][number]) => void;
  demonstrationActionRef?: Ref<View>;
  onBackHome: () => void;
};

export function GuidedSessionContent({
  controller,
  selection,
  onOpenDemonstration,
  demonstrationActionRef,
  onBackHome,
}: GuidedSessionContentProps): React.JSX.Element | null {
  const { width, fontScale } = useWindowDimensions();
  const stackFields = width < 360 || fontScale >= 1.2;
  const fieldClassName = `${stackFields ? 'w-full' : 'min-w-0 flex-1'} gap-5 rounded-v2-field border border-v2-sessionBorder bg-v2-sessionSurface p-2 pt-4`;
  const numericPresentation = {
    className: fieldClassName,
    labelClassName: 'ml-2 text-[13px] leading-[17.55px]',
    controlClassName: 'min-h-[48px] border-0 bg-transparent px-0',
    inputClassName: 'min-w-[40px] py-0 text-[28px] leading-[37.8px]',
    stepperClassName: 'border-0 bg-v2-sessionRaised p-0',
  };
  const session = controller.session;
  if (!session) return null;

  const exercise = selection.currentExercise;
  const currentSet = selection.currentSet;
  const exercisePosition = session.currentExerciseIndex + 1;
  const setPosition = session.currentSetIndex + 1;
  const summary = controller.summary;

  return (
    <View className="gap-5 pb-4">
      {controller.storageError ? (
        <Message
          description={controller.storageError}
          title="Aviso ao salvar seu progresso"
          variant="warning"
        />
      ) : null}
      {controller.actionError ? (
        <View className="gap-3">
          <Message
            description={controller.actionError}
            title="Não foi possível atualizar o treino"
            variant="error"
          />
          {controller.canRetryFinish ? (
            <Button
              disabled={controller.busy}
              label="Tentar novamente"
              loading={controller.busy}
              onPress={() => void controller.finishWorkout()}
              variant="immersive"
            />
          ) : null}
        </View>
      ) : null}

      {session.phase === 'set' && exercise && currentSet ? (
        <View className="gap-5">
          <Card className="gap-2.5 p-5" variant="immersive">
            <Text style={styles.exerciseNumber}>{String(exercisePosition).padStart(2, '0')}</Text>
            <Text className="text-v2-sessionSecondary" variant="label">
              Exercício {exercisePosition} de {selection.progress.totalExerciseCount}
            </Text>
            <Text
              className="text-v2-sessionText"
              style={[styles.exerciseName, stackFields && styles.compactExerciseName]}
              variant="sectionTitle"
            >
              {exercise.exercise.name}
            </Text>
            <View className="h-px bg-v2-sessionBorder" />
            <Text className="font-v2-medium text-v2-sessionText" variant="body">
              {exercise.sets} séries ·{' '}
              {exercise.reps ? `${exercise.reps} reps` : 'Repetições conforme prescrição'}
              {` · descanso de ${exercise.restSeconds ?? 0} s`}
            </Text>
            <Button
              ref={demonstrationActionRef}
              accessibilityLabel={`Ver execução de ${exercise.exercise.name}`}
              disabled={controller.busy}
              label="Ver execução"
              leading={<Play accessible={false} color={colors.primary} size={20} />}
              className="min-h-[48px] bg-v2-sessionRaised px-3 py-2"
              onPress={() => onOpenDemonstration(exercise)}
              variant="immersive"
            />
          </Card>

          <Text className="text-v2-sessionText" variant="sectionTitle" style={styles.setTitle}>
            Série {setPosition} de {exercise.sets}
          </Text>
          {selection.previousSet ? (
            <Card className="gap-1" variant="immersive">
              <Text className="text-v2-sessionSecondary" variant="support">
                Última série registrada
              </Text>
              <Text className="text-v2-sessionText" variant="body">
                {selection.previousSet.repsDone || '—'} reps · {selection.previousSet.loadKg || '—'}{' '}
                kg
              </Text>
            </Card>
          ) : null}

          <View className={stackFields ? 'gap-3' : 'flex-row gap-3'}>
            <NumericField
              {...numericPresentation}
              accessibilityLabel="Repetições realizadas"
              accessibilityHint="Informe a quantidade de repetições realizadas"
              decrementLabel="Diminuir Repetições realizadas"
              editable={!controller.busy}
              incrementLabel="Aumentar Repetições realizadas"
              keyboardType="number-pad"
              label="REPETIÇÕES"
              placeholder="—"
              onChangeText={(repsDone) => void controller.updateSet({ repsDone })}
              onDecrement={() =>
                void controller.updateSet({
                  repsDone: adjustSessionValue(currentSet.repsDone, -1),
                })
              }
              onIncrement={() =>
                void controller.updateSet({
                  repsDone: adjustSessionValue(currentSet.repsDone, 1),
                })
              }
              value={currentSet.repsDone}
              variant="immersive"
            />
            <NumericField
              {...numericPresentation}
              accessibilityLabel="Carga utilizada"
              accessibilityHint="Informe a carga usada no exercício"
              decrementLabel="Diminuir Carga utilizada"
              editable={!controller.busy}
              incrementLabel="Aumentar Carga utilizada"
              keyboardType="number-pad"
              label="CARGA (kg)"
              onChangeText={(loadKg) => void controller.updateSet({ loadKg })}
              onDecrement={() =>
                void controller.updateSet({
                  loadKg: adjustSessionValue(currentSet.loadKg, -1),
                })
              }
              onIncrement={() =>
                void controller.updateSet({
                  loadKg: adjustSessionValue(currentSet.loadKg, 1),
                })
              }
              value={currentSet.loadKg}
              variant="immersive"
            />
          </View>
          <Text className="text-v2-sessionSecondary" variant="body">
            Registre os valores realizados antes de avançar.
          </Text>
          <Button
            disabled={controller.busy}
            label="Concluir série"
            loading={controller.busy}
            onPress={() => void controller.completeSet()}
            labelClassName="text-[16px]"
          />
          {selection.nextExercise ? (
            <Text className="text-v2-sessionSecondary text-[16px]" variant="body">
              A seguir: {selection.nextExercise.exercise.name}
            </Text>
          ) : null}
        </View>
      ) : null}

      {session.phase === 'rest' && exercise ? (
        <View className="gap-4">
          <Card className="items-center gap-4 px-5 py-8" variant="immersive">
            <Text className="text-v2-sessionSecondary" variant="support">
              {exercise.exercise.name} · Série {setPosition} concluída
            </Text>
            <Text className="text-v2-sessionText" variant="sectionTitle">
              Descanso
            </Text>
            <RestTimer restEndsAtMs={session.restEndsAtMs} />
            <Text className="text-v2-sessionSecondary" variant="body">
              Próxima série · {setPosition + 1}
            </Text>
            <Text className="text-v2-sessionSecondary" variant="support">
              Tempo restante
            </Text>
          </Card>
          <Button
            ref={demonstrationActionRef}
            accessibilityLabel={`Ver execução de ${exercise.exercise.name}`}
            disabled={controller.busy}
            label="Ver execução"
            leading={<Play accessible={false} color={colors.sessionText} size={20} />}
            onPress={() => onOpenDemonstration(exercise)}
            variant="immersive"
          />
          <View className="gap-3">
            <Button
              disabled={controller.busy}
              label="+15 s"
              loading={controller.busy}
              onPress={() => void controller.addRestTime()}
              variant="immersive"
            />
            <Button
              disabled={controller.busy}
              label="Pular descanso"
              loading={controller.busy}
              onPress={() => void controller.skipRest()}
              variant="immersive"
            />
          </View>
        </View>
      ) : null}

      {session.phase === 'exercise-complete' && exercise ? (
        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-v2-sessionText" variant="sectionTitle">
              {exercise.exercise.name} concluído
            </Text>
            <Text className="text-v2-sessionSecondary" variant="body">
              Séries registradas. Você está avançando bem.
            </Text>
          </View>
          {selection.nextExercise ? (
            <ExercisePreview
              exercise={selection.nextExercise}
              onOpenDemonstration={onOpenDemonstration}
              demonstrationActionRef={demonstrationActionRef}
              busy={controller.busy}
            />
          ) : null}
          <Button
            disabled={controller.busy}
            label="Próximo exercício"
            loading={controller.busy}
            onPress={() => void controller.continueAfterExercise()}
          />
        </View>
      ) : null}

      {session.phase === 'ready-to-finish' ? (
        <View className="gap-4">
          <Text className="text-v2-sessionSecondary" variant="body">
            Última série do treino
          </Text>
          <Text className="text-v2-sessionText" variant="sectionTitle">
            Pronto para finalizar
          </Text>
          <Text className="text-v2-sessionSecondary" variant="body">
            {selection.progress.progressPercent}% do treino concluído
          </Text>
          <Button
            disabled={controller.busy}
            label="Concluir e finalizar treino"
            loading={controller.busy}
            onPress={() => void controller.finishWorkout()}
          />
        </View>
      ) : null}

      {session.phase === 'summary' && summary ? (
        <View className="gap-4">
          <Text className="text-v2-sessionText text-center" variant="sectionTitle">
            Treino concluído
          </Text>
          <Text className="text-v2-sessionSecondary text-center" variant="body">
            Parabéns! Você concluiu a sessão.
          </Text>
          <Card className="gap-3" variant="immersive">
            <Text className="text-v2-sessionText" variant="body">
              Duração total: {summary.durationMin} min
            </Text>
            <Text className="text-v2-sessionText" variant="body">
              Exercícios: {summary.exerciseCount}
            </Text>
            <Text className="text-v2-sessionText" variant="body">
              Séries: {summary.completedSetCount}
            </Text>
            <Text className="text-v2-sessionText" variant="body">
              Volume total: {summary.volumeKg} kg
            </Text>
          </Card>
          <Text className="text-v2-sessionSecondary" variant="support">
            {controller.queued
              ? 'Treino salvo para sincronização'
              : 'Resumo salvo no seu acompanhamento.'}
          </Text>
          <Button disabled={controller.busy} label="Voltar ao início" onPress={onBackHome} />
        </View>
      ) : null}
    </View>
  );
}

const styles = {
  exerciseNumber: {
    color: colors.primary,
    fontFamily: fontFamilies.bold,
    fontSize: 64,
    lineHeight: 64 * 1.2,
  },
  exerciseName: {
    fontSize: 28,
    lineHeight: 28 * 1.35,
  },
  compactExerciseName: {
    fontSize: penTokens['font/size/20'],
    lineHeight: penTokens['font/size/20'] * 1.35,
  },
  setTitle: {
    fontSize: penTokens['font/size/26'],
    lineHeight: penTokens['font/size/26'] * 1.35,
  },
};

function ExercisePreview({
  exercise,
  onOpenDemonstration,
  demonstrationActionRef,
  busy,
}: {
  exercise: WorkoutDay['exercises'][number];
  onOpenDemonstration: GuidedSessionContentProps['onOpenDemonstration'];
  demonstrationActionRef?: GuidedSessionContentProps['demonstrationActionRef'];
  busy: boolean;
}): React.JSX.Element {
  return (
    <Card className="gap-3" variant="immersive">
      <Text className="text-v2-sessionSecondary" variant="support">
        Próximo exercício
      </Text>
      <Text className="text-[20px] leading-[26px] text-v2-sessionText" variant="sectionTitle">
        {exercise.exercise.name}
      </Text>
      <Text className="text-v2-sessionSecondary" variant="body">
        {exercise.reps ? `${exercise.reps} reps` : 'Repetições conforme prescrição'}
        {exercise.loadKg === null || exercise.loadKg === undefined
          ? ' · peso conforme prescrição'
          : ` · ${exercise.loadKg} kg`}
      </Text>
      <Button
        ref={demonstrationActionRef}
        accessibilityLabel={`Ver execução de ${exercise.exercise.name}`}
        disabled={busy}
        label="Ver execução"
        leading={<Play accessible={false} color={colors.sessionText} size={20} />}
        onPress={() => onOpenDemonstration(exercise)}
        variant="immersive"
      />
    </Card>
  );
}

function RestTimer({ restEndsAtMs }: { restEndsAtMs: number | null }): React.JSX.Element {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    updateNow();
    const interval = setInterval(updateNow, 1_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateNow();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  const remainingSeconds = Math.max(0, Math.ceil(((restEndsAtMs ?? nowMs) - nowMs) / 1_000));
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const seconds = String(remainingSeconds % 60).padStart(2, '0');

  return (
    <Text
      accessibilityLiveRegion="polite"
      className="text-v2-sessionText"
      maxFontSizeMultiplier={1.4}
      variant="timer"
    >
      {minutes}:{seconds}
    </Text>
  );
}
