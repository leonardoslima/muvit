import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import type { Assessment } from '../application/assessments/assessment-data';
import { getAssessment } from '../application/assessments/assessment-data';
import { AssessmentHeading } from '../components/assessments/assessment-heading';
import { AssessmentMeasurementsCard } from '../components/assessments/assessment-measurements-card';
import { AssessmentMetric } from '../components/assessments/assessment-metric';
import { AssessmentPhotoList } from '../components/assessments/assessment-photo-list';
import { TrainerScreen } from '../components/trainer/trainer-screen';
import { ActionFeedback } from '../components/ui/v2/action-feedback';
import { StatePanel } from '../components/ui/v2/state-panel';
import { Text } from '../components/ui/v2/text';
import { ApiError } from '../lib/api';
import { spacing } from '../lib/design-system/tokens';
import { useApiClient } from '../lib/use-api';

export function TrainerAssessmentDetailScreen(): React.JSX.Element {
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

  const assessment = query.data;
  const isNotFound = query.error instanceof ApiError && query.error.status === 404;
  const isWrongStudent = Boolean(assessment && studentId && assessment.studentId !== studentId);
  const refreshDisabled =
    !studentId || !assessmentId || query.isFetching || isNotFound || isWrongStudent;

  function returnToAssessments(): void {
    if (!studentId) {
      router.dismissTo('/trainer/students');
      return;
    }

    router.dismissTo(`/trainer/students/${studentId}/assessments`);
  }

  function refreshAssessment(): void {
    if (refreshDisabled) return;

    void query.refetch();
  }

  function renderContent(): React.JSX.Element {
    if (!studentId || !assessmentId) {
      return (
        <StatePanel
          className="flex-1"
          description="Não foi possível identificar a avaliação solicitada."
          kind="error"
          title="Avaliação inválida"
        />
      );
    }

    if (query.isPending) {
      return (
        <StatePanel
          className="flex-1"
          description="Estamos carregando os dados desta avaliação."
          kind="loading"
          title="Carregando avaliação"
        />
      );
    }

    if (isNotFound) {
      return (
        <StatePanel
          className="flex-1"
          description="Esta avaliação não está disponível para sua conta."
          kind="error"
          title="Avaliação não encontrada"
        />
      );
    }

    if (query.isError && !assessment) {
      return (
        <StatePanel
          className="flex-1"
          description="Verifique sua conexão e tente atualizar pelo cabeçalho."
          kind="error"
          title="Não foi possível carregar a avaliação"
        />
      );
    }

    if (isWrongStudent) {
      return (
        <StatePanel
          className="flex-1"
          description="Esta avaliação não pertence ao aluno aberto neste contexto."
          kind="error"
          title="Avaliação indisponível"
        />
      );
    }

    if (!assessment) {
      return (
        <StatePanel
          className="flex-1"
          description="Não foi possível carregar os dados desta avaliação."
          kind="error"
          title="Avaliação indisponível"
        />
      );
    }

    const dateLabel = formatDate(assessment.date);
    const photos = assessment.photos?.filter((photo) => photo.trim().length > 0) ?? [];

    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          gap: spacing.xxl,
          paddingTop: spacing.sm,
        }}
      >
        <AssessmentHeading subtitle="Avaliação do aluno" title={dateLabel} />

        <View className="gap-3">
          <Text variant="sectionTitle">Métricas principais</Text>
          <View className="gap-1">
            <AssessmentMetric label="Peso" value={formatMetric(assessment.weightKg, 'kg')} />
            <AssessmentMetric label="Altura" value={formatMetric(assessment.heightCm, 'cm')} />
            <AssessmentMetric
              label="Gordura corporal"
              value={formatMetric(assessment.bodyFatPct, '%')}
            />
          </View>
        </View>

        <AssessmentMeasurementsCard measurements={assessment.measurements} />

        {photos.length > 0 ? (
          <View className="gap-3">
            <Text variant="sectionTitle">Fotos</Text>
            <AssessmentPhotoList dateLabel={dateLabel} photos={photos} />
          </View>
        ) : null}

        <View className="gap-3">
          <Text variant="sectionTitle">Observações</Text>
          <Text className="text-v2-secondary">{formatNotes(assessment.notes)}</Text>
        </View>

        {query.isRefetchError ? (
          <ActionFeedback
            eventKey={query.errorUpdatedAt}
            title="Não foi possível atualizar a avaliação."
            variant="error"
          />
        ) : null}
      </ScrollView>
    );
  }

  return (
    <TrainerScreen
      backLabel={studentId ? 'Voltar para avaliações' : 'Voltar para alunos'}
      contextual
      onBack={returnToAssessments}
      onRefresh={refreshAssessment}
      refreshDisabled={refreshDisabled}
      refreshing={Boolean(assessment) && query.isRefetching && !isNotFound && !isWrongStudent}
      title={studentId ? 'Avaliações' : 'Alunos'}
    >
      {renderContent()}
    </TrainerScreen>
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
