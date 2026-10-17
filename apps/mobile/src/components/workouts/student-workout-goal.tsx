import { updateWorkoutGoalSchema } from '@muvit/validators';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { spacing } from '../../lib/design-system/tokens';
import { useWorkoutGoal } from '../../lib/use-workout-goal';
import { Button, Card, Message, NumericField, Text } from '../ui/v2';

export function StudentWorkoutGoal() {
  const { query, save, saving } = useWorkoutGoal();
  const [edited, setEdited] = useState<string>();
  const [feedback, setFeedback] = useState<'success' | 'error'>();
  const submitting = useRef(false);
  const stored = query.data?.weeklyGoal;
  const value = edited ?? (stored === null || stored === undefined ? '' : String(stored));
  const parsed = updateWorkoutGoalSchema.safeParse({
    weeklyGoal: value.trim() ? Number(value) : null,
  });
  const error = value && !parsed.success ? 'Informe uma meta entre 1 e 7 treinos.' : undefined;

  async function submit(goal: number | null): Promise<void> {
    if (submitting.current) return;
    submitting.current = true;
    setFeedback(undefined);
    try {
      await save(goal);
      setEdited(undefined);
      setFeedback('success');
    } catch {
      setFeedback('error');
    } finally {
      submitting.current = false;
    }
  }

  function edit(next: string): void {
    setEdited(next);
    setFeedback(undefined);
  }

  return (
    <Card className="gap-4 border-0">
      <Text accessibilityRole="header" variant="sectionTitle">
        Meta semanal
      </Text>
      <Text className="text-v2-secondary">
        Escolha quantos treinos pretende concluir por semana.
      </Text>
      {query.isPending ? <Text accessibilityLiveRegion="polite">Carregando meta…</Text> : null}
      {query.isError ? (
        <Message
          variant="error"
          description="Não foi possível carregar sua meta."
          action={{
            label: 'Tentar carregar meta novamente',
            onPress: () => {
              void query.refetch();
            },
            disabled: query.isFetching,
          }}
        />
      ) : null}
      {query.data ? (
        <>
          <NumericField
            label="Treinos por semana"
            value={value}
            onChangeText={edit}
            placeholder="Sem meta"
            keyboardType="number-pad"
            maxLength={2}
            error={error}
            disabled={saving}
            hint="De 1 a 7 treinos. Você pode remover a meta quando quiser."
            onIncrement={() => edit(String(Math.min(7, Math.max(1, (Number(value) || 0) + 1))))}
            onDecrement={() => edit(String(Math.max(1, Math.min(7, (Number(value) || 1) - 1))))}
          />
          <View style={{ gap: spacing.md }}>
            <Button
              label="Salvar meta"
              disabled={saving || !value.trim() || !parsed.success || Number(value) === stored}
              loading={saving}
              onPress={() => {
                if (parsed.success) void submit(parsed.data.weeklyGoal);
              }}
            />
            {stored !== null ? (
              <Button
                label="Remover meta"
                variant="text"
                disabled={saving}
                onPress={() => {
                  void submit(null);
                }}
              />
            ) : null}
          </View>
        </>
      ) : null}
      {feedback ? (
        <Message
          variant={feedback === 'success' ? 'success' : 'error'}
          description={
            feedback === 'success'
              ? 'Meta semanal atualizada.'
              : 'Não foi possível salvar sua meta. Tente novamente.'
          }
        />
      ) : null}
    </Card>
  );
}
