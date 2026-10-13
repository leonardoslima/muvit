import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { type LayoutChangeEvent, ScrollView, View } from 'react-native';
import { getTrainerSummary } from '../application/trainer/trainer-data';
import { TrainerMetricCard } from '../components/trainer/trainer-metric-card';
import { TrainerScreen } from '../components/trainer/trainer-screen';
import { Button } from '../components/ui/v2/button';
import { Message } from '../components/ui/v2/message';
import { StatePanel } from '../components/ui/v2/state-panel';
import { Text } from '../components/ui/v2/text';
import { spacing } from '../lib/design-system/tokens';
import { useApiClient } from '../lib/use-api';

export function TrainerHomeScreen(): React.JSX.Element {
  const api = useApiClient();
  const [portfolioWidth, setPortfolioWidth] = useState<number>();
  const query = useQuery({
    queryKey: ['trainer', 'summary'],
    queryFn: ({ signal }) => getTrainerSummary(api, signal),
  });
  const hasData = Boolean(query.data);
  const refresh = (): void => {
    void query.refetch();
  };
  const handlePortfolioLayout = (event: LayoutChangeEvent): void => {
    setPortfolioWidth(event.nativeEvent.layout.width);
  };

  if (query.isPending) {
    return (
      <TrainerScreen
        onRefresh={refresh}
        refreshDisabled
        subtitle="Acompanhe sua carteira de alunos."
        title="Início"
      >
        <StatePanel
          description="Estamos carregando os indicadores da sua operação."
          kind="loading"
          title="Carregando visão geral"
          className="flex-1"
        />
      </TrainerScreen>
    );
  }

  if (!query.data) {
    return (
      <TrainerScreen
        onRefresh={refresh}
        refreshDisabled={query.isFetching}
        subtitle="Acompanhe sua carteira de alunos."
        title="Início"
      >
        <StatePanel
          description="Verifique sua conexão e atualize para tentar novamente."
          kind="error"
          title="Não foi possível carregar a visão geral"
          className="flex-1"
        />
      </TrainerScreen>
    );
  }

  const summary = query.data;

  return (
    <TrainerScreen
      onRefresh={refresh}
      refreshDisabled={query.isFetching}
      refreshing={query.isRefetching && hasData}
      subtitle="Acompanhe sua carteira de alunos."
      title="Início"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ gap: spacing.md }}>
        {query.isRefetchError ? (
          <Message title="Não foi possível atualizar a visão geral." variant="error" />
        ) : null}

        {summary.students.total === 0 ? (
          <StatePanel
            description="Nenhum aluno vinculado para acompanhar no momento."
            kind="empty"
            title="Nenhum aluno vinculado"
          />
        ) : (
          <>
            <View
              className="gap-4 rounded-[26px] bg-v2-text p-6"
              onLayout={handlePortfolioLayout}
              testID="trainer-portfolio"
            >
              <View className="gap-1">
                <Text className="text-v2-sessionText" variant="label">
                  Alunos ativos
                </Text>
                <Text
                  className={`font-v2-bold text-v2-sessionText ${portfolioWidth !== undefined && portfolioWidth <= 300 ? 'text-[44px] leading-[49px]' : 'text-[50px] leading-[55px]'}`}
                >
                  {summary.students.active}
                </Text>
                <Text className="text-v2-sessionText">
                  {summary.students.total} alunos vinculados
                </Text>
              </View>
              <View
                className="flex-col gap-2 border-t border-v2-borderOnBrand pt-2"
                testID="trainer-status-group"
              >
                <Text className="text-v2-sessionText">
                  {summary.students.paused} {summary.students.paused === 1 ? 'pausado' : 'pausados'}
                </Text>
                <Text className="text-v2-sessionText">
                  {summary.students.inactive}{' '}
                  {summary.students.inactive === 1 ? 'inativo' : 'inativos'}
                </Text>
              </View>
              <Link asChild href="/trainer/students">
                <Button className="w-full" compact label="Ver alunos" />
              </Link>
            </View>
            <View className="flex-row flex-wrap gap-3">
              <TrainerMetricCard label="Novos na semana" value={summary.students.newThisWeek} />
              <TrainerMetricCard label="Planos ativos" value={summary.workouts.activePlans} />
              <TrainerMetricCard
                label="Avaliações em 30 dias"
                value={summary.assessments.last30d}
              />
            </View>
          </>
        )}
      </ScrollView>
    </TrainerScreen>
  );
}
