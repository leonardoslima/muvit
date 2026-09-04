import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { Assessment } from '../application/assessments/assessment-data';
import { getAssessment } from '../application/assessments/assessment-data';
import { AssessmentMeasurementsCard } from '../components/assessments/assessment-measurements-card';
import { AssessmentMetric } from '../components/assessments/assessment-metric';
import { AssessmentPhotoList } from '../components/assessments/assessment-photo-list';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { ApiError } from '../lib/api';
import { colors, sharedStyles, spacing, typography } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerAssessmentDetailScreen() {
  const api = useApiClient();
  const params = useLocalSearchParams<{
    studentId?: string | string[];
    assessmentId?: string | string[];
  }>();
  const studentId = firstParam(params.studentId);
  const assessmentId = firstParam(params.assessmentId);
  const query = useQuery({
    enabled: Boolean(studentId && assessmentId),
    queryKey: ['trainer', 'assessment', assessmentId],
    queryFn: ({ signal }) => {
      if (!assessmentId) {
        throw new Error('Avaliação inválida.');
      }

      return getAssessment(api, assessmentId, signal);
    },
  });

  function returnToAssessments(): void {
    if (!studentId) {
      router.replace('/trainer/students');
      return;
    }

    router.replace(`/trainer/students/${studentId}/assessments`);
  }

  if (!studentId || !assessmentId) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para avaliações"
          description="Não foi possível identificar a avaliação solicitada."
          onAction={returnToAssessments}
          title="Avaliação inválida"
          tone="error"
        />
      </Screen>
    );
  }

  if (query.isPending) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          description="Estamos carregando os dados desta avaliação."
          title="Carregando avaliação"
          tone="loading"
        />
      </Screen>
    );
  }

  const isNotFound = query.error instanceof ApiError && query.error.status === 404;

  if (isNotFound && !query.data) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para avaliações"
          description="Esta avaliação não está disponível para sua conta."
          onAction={returnToAssessments}
          title="Avaliação não encontrada"
          tone="error"
        />
      </Screen>
    );
  }

  if (query.isError && !query.data) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionDisabled={query.isRefetching}
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void query.refetch()}
          title="Não foi possível carregar a avaliação"
          tone="error"
        />
      </Screen>
    );
  }

  const assessment = query.data;

  if (assessment.studentId !== studentId) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          actionLabel="Voltar para avaliações"
          description="Esta avaliação não pertence ao aluno aberto neste contexto."
          onAction={returnToAssessments}
          title="Avaliação indisponível"
          tone="error"
        />
      </Screen>
    );
  }

  const dateLabel = formatDate(assessment.date);
  const photos = assessment.photos?.filter((photo) => photo.trim().length > 0) ?? [];

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <AppButton label="Voltar para avaliações" onPress={returnToAssessments} variant="secondary" />
      <ScreenHeader eyebrow="Avaliação" title={dateLabel} />

      <Card>
        <Text style={styles.sectionTitle}>Métricas principais</Text>
        <View style={styles.metrics}>
          <AssessmentMetric label="Peso" value={formatMetric(assessment.weightKg, 'kg')} />
          <AssessmentMetric label="Altura" value={formatMetric(assessment.heightCm, 'cm')} />
          <AssessmentMetric
            label="Gordura corporal"
            value={formatMetric(assessment.bodyFatPct, '%')}
          />
        </View>
      </Card>

      <AssessmentMeasurementsCard measurements={assessment.measurements} />

      {photos.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Fotos</Text>
          <AssessmentPhotoList dateLabel={dateLabel} photos={photos} />
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Observações</Text>
        <Text style={sharedStyles.subtitle}>{formatNotes(assessment.notes)}</Text>
      </Card>

      {query.isRefetchError ? (
        <InlineMessage message="Não foi possível atualizar a avaliação." tone="error" />
      ) : null}

      <AppButton
        disabled={query.isRefetching}
        label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
        onPress={() => void query.refetch()}
        variant="secondary"
      />
    </Screen>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatMetric(value: Assessment['weightKg'], unit: string): string {
  if (value === null) {
    return 'Não informado';
  }

  const number = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(number)) {
    return 'Não informado';
  }

  const formatted = number.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return unit === '%' ? `${formatted}%` : `${formatted} ${unit}`;
}

function formatNotes(value: string | null): string {
  return value?.trim() || 'Não informado';
}

const styles = StyleSheet.create({
  centeredState: {
    justifyContent: 'center',
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  metrics: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    ...typography.cardTitle,
  },
});
