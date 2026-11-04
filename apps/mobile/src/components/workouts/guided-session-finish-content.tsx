import { CircleCheck } from 'lucide-react-native';
import { View } from 'react-native';
import type { GuidedSessionView } from '../../application/workouts/guided-session-presentation';
import { colors, fontFamilies, penTokens } from '../../lib/design-system/tokens';
import type { GuidedWorkoutController } from '../../lib/use-guided-workout-session';
import { ActionFeedback, Button, Card, Text } from '../ui/v2';

type GuidedSessionFinishContentProps = {
  controller: GuidedWorkoutController;
  selection: GuidedSessionView;
  onBackHome: () => void;
};

export function GuidedSessionFinishContent({
  controller,
  selection,
  onBackHome,
}: GuidedSessionFinishContentProps): React.JSX.Element | null {
  const { session, summary } = controller;
  if (!session) return null;
  const completedSets = session.sets.filter((set) => set.completed);
  const skippedCount = session.sets.filter((set) => set.skipped && !set.completed).length;
  const partial = skippedCount > 0;
  const ready = session.phase === 'ready-to-finish';
  const exercise = selection.currentExercise;
  const exerciseSets = session.sets.filter((set) => set.workoutExerciseId === exercise?.id);
  const exerciseCompletedCount = exerciseSets.filter((set) => set.completed).length;
  const exerciseSkippedCount = exerciseSets.filter((set) => set.skipped && !set.completed).length;
  const performedExerciseCount = new Set(completedSets.map((set) => set.workoutExerciseId)).size;
  const retryFinish = ready && controller.canRetryFinish;

  return (
    <View className="gap-5">
      <CircleCheck accessible={false} color={colors.primary} size={48} />
      <Text
        accessibilityRole="header"
        variant="sectionTitle"
        className="text-v2-sessionText"
        style={finishTextStyles.title}
      >
        {ready ? 'Pronto para finalizar' : partial ? 'Treino finalizado' : 'Treino concluído'}
      </Text>
      <Text className="text-v2-sessionSecondary" style={finishTextStyles.description}>
        {ready
          ? partial
            ? 'As séries restantes foram puladas nesta sessão.'
            : 'Você registrou todas as séries do treino.'
          : partial
            ? `${completedSets.length} ${completedSets.length === 1 ? 'série realizada' : 'séries realizadas'} · ${skippedCount} puladas nesta sessão.`
            : 'Você concluiu todas as séries.'}
      </Text>

      {ready ? (
        <>
          {exercise ? (
            <Text className="text-v2-sessionText" style={finishTextStyles.exercise}>
              {exercise.exercise.name} ·{' '}
              {exerciseSkippedCount
                ? `${exerciseCompletedCount} ${exerciseCompletedCount === 1 ? 'série feita' : 'séries feitas'} e ${exerciseSkippedCount} puladas`
                : `${exerciseCompletedCount} de ${exercise.sets} ${exercise.sets === 1 ? 'série' : 'séries'}`}
            </Text>
          ) : null}
          {controller.actionError ? (
            <ActionFeedback
              title="Não foi possível concluir o treino"
              description={
                retryFinish
                  ? 'Seus registros foram preservados. Tente novamente.'
                  : controller.actionError
              }
              variant="error"
              className="rounded-[20px] p-4"
            />
          ) : null}
          {controller.storageError ? (
            <ActionFeedback
              title="Aviso ao salvar seu progresso"
              description={controller.storageError}
              variant="warning"
              className="rounded-[20px] p-4"
            />
          ) : null}
          <Text className="text-v2-sessionSecondary" style={finishTextStyles.support}>
            {performedExerciseCount} {performedExerciseCount === 1 ? 'exercício' : 'exercícios'} ·{' '}
            {completedSets.length}{' '}
            {completedSets.length === 1 ? 'série registrada' : 'séries registradas'}
            {partial ? ` · ${skippedCount} puladas` : ''}
          </Text>
          <Button
            disabled={controller.busy || completedSets.length === 0}
            label={
              controller.busy
                ? 'Finalizando…'
                : retryFinish
                  ? 'Tentar novamente'
                  : partial
                    ? 'Finalizar treino'
                    : 'Concluir e finalizar treino'
            }
            loading={controller.busy}
            labelClassName="text-[16px]"
            onPress={() => void controller.finishWorkout()}
          />
          <Text className="text-v2-sessionSecondary" style={finishTextStyles.note}>
            {completedSets.length === 0
              ? 'Nenhuma série registrada. Saia da sessão para descartar este treino.'
              : 'A conclusão será registrada ao finalizar.'}
          </Text>
        </>
      ) : summary ? (
        <>
          <Card className="gap-5 border-0 p-5" variant="immersive">
            <SummaryRow label="Duração total" value={`${summary.durationMin} min`} />
            <SummaryRow
              label={partial ? 'Exercícios completos' : 'Exercícios'}
              value={String(
                partial ? selection.progress.completedExerciseCount : summary.exerciseCount,
              )}
            />
            {partial ? (
              <>
                <SummaryRow
                  label="Exercícios parciais"
                  value={String(selection.progress.partialExerciseCount ?? 0)}
                />
                <SummaryRow
                  label="Exercícios pulados"
                  value={String(selection.progress.skippedExerciseCount ?? 0)}
                />
              </>
            ) : null}
            <SummaryRow
              label={partial ? 'Séries realizadas' : 'Séries'}
              value={String(summary.completedSetCount)}
            />
            {partial ? <SummaryRow label="Séries puladas" value={String(skippedCount)} /> : null}
            <SummaryRow
              label="Volume total"
              value={`${summary.volumeKg.toLocaleString('pt-BR')} kg`}
            />
          </Card>
          {controller.queued ? (
            <ActionFeedback
              title="Salvo neste aparelho"
              description="Seu treino está salvo para sincronização. Você pode voltar ao início."
              variant="warning"
              className="rounded-[20px] p-4"
            />
          ) : (
            <Text className="text-v2-sessionSecondary" style={finishTextStyles.support}>
              Resumo salvo no seu acompanhamento.
            </Text>
          )}
          {controller.storageError || controller.actionError ? (
            <ActionFeedback
              title="Treino concluído"
              description={controller.storageError ?? controller.actionError ?? undefined}
              variant="warning"
              className="rounded-[20px] p-4"
            />
          ) : null}
          <Button
            disabled={controller.busy}
            label="Voltar ao início"
            labelClassName="text-[16px]"
            onPress={onBackHome}
          />
        </>
      ) : null}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      className="flex-row items-start gap-3"
    >
      <Text className="min-w-0 flex-1 text-v2-sessionSecondary" style={finishTextStyles.support}>
        {label}
      </Text>
      <Text
        variant="sectionTitle"
        className="max-w-[50%] shrink text-right text-v2-sessionText"
        style={finishTextStyles.value}
      >
        {value}
      </Text>
    </View>
  );
}

const finishTextStyles = {
  title: { fontFamily: fontFamilies.bold, fontSize: 32, lineHeight: 43.2 },
  description: {
    fontFamily: fontFamilies.regular,
    fontSize: penTokens['font/size/17'],
    lineHeight: 22.95,
  },
  exercise: {
    fontFamily: fontFamilies.semibold,
    fontSize: penTokens['font/size/20'],
    lineHeight: 27,
  },
  support: {
    fontFamily: fontFamilies.regular,
    fontSize: penTokens['font/size/16'],
    lineHeight: 21.6,
  },
  note: {
    fontFamily: fontFamilies.regular,
    fontSize: penTokens['font/size/14'],
    lineHeight: 18.9,
  },
  value: { fontFamily: fontFamilies.bold, fontSize: penTokens['font/size/20'], lineHeight: 27 },
};
