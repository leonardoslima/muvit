import type { assessmentSchema } from '@muvit/validators';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';

import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { colors, fontFamilies, sharedStyles, spacing } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

type Assessment = z.infer<typeof assessmentSchema>;

export function ProgressScreen() {
  const api = useApiClient();

  const query = useQuery({
    queryKey: ['assessments', 'me'],
    queryFn: async () => {
      return api.request<{ items: Assessment[]; total: number }>(
        '/students/me/assessments?limit=20',
      );
    },
  });

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <ScreenHeader
            subtitle="Acompanhe suas medidas e perceba sua evolução."
            title="Progresso"
          />
        </View>
        <Link asChild href="/new-assessment">
          <AppButton label="Nova avaliação" onPress={() => undefined} variant="secondary" />
        </Link>
      </View>

      {query.isLoading ? (
        <StatePanel
          description="Estamos buscando suas avaliações mais recentes."
          title="Carregando progresso"
          tone="loading"
        />
      ) : null}

      {query.isError ? (
        <StatePanel
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void query.refetch()}
          title="Não foi possível carregar seu progresso"
          tone="error"
        />
      ) : null}

      {query.data?.items.length === 0 ? (
        <StatePanel
          description="Registre uma avaliação para acompanhar sua evolução."
          title="Nenhuma avaliação registrada"
          tone="empty"
        />
      ) : null}

      {query.data?.items.map((assessment: Assessment, index: number) => (
        <AssessmentCard
          assessment={assessment}
          key={assessment.id}
          previousAssessment={query.data?.items[index + 1]}
        />
      ))}
    </Screen>
  );
}

function AssessmentCard({
  assessment,
  previousAssessment,
}: {
  assessment: Assessment;
  previousAssessment?: Assessment;
}) {
  const weight = toNumber(assessment.weightKg);
  const bodyFat = toNumber(assessment.bodyFatPct);
  const previousWeight = toNumber(previousAssessment?.weightKg);
  const previousBodyFat = toNumber(previousAssessment?.bodyFatPct);

  return (
    <Card testID={`assessment-card-${assessment.id}`}>
      <Text style={styles.date}>{formatDate(assessment.date)}</Text>
      <View style={styles.metrics}>
        <Metric label="Peso" value={formatMetric(weight, 'kg')} />
        <Metric label="Gordura corporal" value={formatBodyFat(bodyFat)} />
      </View>
      {weight !== null && previousWeight !== null ? (
        <Comparison label={formatDelta(weight - previousWeight, 'kg')} />
      ) : null}
      {bodyFat !== null && previousBodyFat !== null ? (
        <Comparison label={formatDelta(bodyFat - previousBodyFat, 'p.p.')} />
      ) : null}
      {assessment.notes ? <Text style={sharedStyles.subtitle}>{assessment.notes}</Text> : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={sharedStyles.label}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Comparison({ label }: { label: string }) {
  return <Text style={styles.comparison}>{label}</Text>;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const normalized = typeof value === 'number' ? value : Number(value.replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : null;
}

function formatMetric(value: number | null, unit: string): string {
  return value === null ? `— ${unit}` : `${formatNumber(value)} ${unit}`;
}

function formatBodyFat(value: number | null): string {
  return value === null ? '—% de gordura' : `${formatNumber(value)}% de gordura`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function formatDelta(delta: number, unit: string): string {
  if (delta === 0) return `Sem alteração em ${unit}`;
  const direction = delta < 0 ? 'a menos' : 'a mais';
  return `${formatNumber(Math.abs(delta))} ${unit} ${direction}`;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
  },
  date: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 20,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  metric: {
    flexGrow: 1,
    minWidth: 120,
  },
  metricValue: {
    color: colors.ink,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 18,
  },
  comparison: {
    color: colors.primary,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
  },
});
