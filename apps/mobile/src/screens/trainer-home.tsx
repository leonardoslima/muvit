import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { getTrainerSummary } from '../application/trainer/trainer-data';
import { TrainerMetricCard } from '../components/trainer/trainer-metric-card';
import { AppButton } from '../components/ui/button';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { sharedStyles, spacing } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerHomeScreen() {
  const api = useApiClient();
  const query = useQuery({
    queryKey: ['trainer', 'summary'],
    queryFn: ({ signal }) => getTrainerSummary(api, signal),
  });

  if (query.isPending) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          description="Estamos carregando os indicadores da sua operação."
          title="Carregando visão geral"
          tone="loading"
        />
      </Screen>
    );
  }

  if (!query.data) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionDisabled={query.isRefetching}
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void query.refetch()}
          title="Não foi possível carregar a visão geral"
          tone="error"
        />
      </Screen>
    );
  }

  const summary = query.data;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <ScreenHeader subtitle="Acompanhe os principais sinais da sua carteira." title="Início" />

      {summary.students.total === 0 ? (
        <StatePanel
          description="Nenhum aluno vinculado para acompanhar no momento."
          title="Nenhum aluno vinculado"
          tone="empty"
        />
      ) : (
        <>
          <View style={styles.metrics}>
            <TrainerMetricCard
              description={`${summary.students.total} vinculados`}
              label="Alunos ativos"
              value={summary.students.active}
            />
            <TrainerMetricCard label="Novos na semana" value={summary.students.newThisWeek} />
            <TrainerMetricCard label="Planos ativos" value={summary.workouts.activePlans} />
            <TrainerMetricCard label="Avaliações em 30 dias" value={summary.assessments.last30d} />
          </View>
          <Text style={sharedStyles.subtitle}>
            {summary.students.paused} pausados • {summary.students.inactive} inativos
          </Text>
        </>
      )}

      {query.isRefetchError ? (
        <InlineMessage message="Não foi possível atualizar a visão geral." tone="error" />
      ) : null}

      <AppButton
        disabled={query.isRefetching}
        label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
        onPress={() => void query.refetch()}
        variant="secondary"
      />

      <Link asChild href="/trainer/students">
        <AppButton label="Ver alunos" onPress={() => undefined} />
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    justifyContent: 'center',
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
