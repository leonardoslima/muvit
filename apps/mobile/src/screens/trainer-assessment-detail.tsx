import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Assessment } from '../application/assessments/assessment-data';
import { getAssessment } from '../application/assessments/assessment-data';
import type { TrainerStudent } from '../application/trainer/trainer-data';
import { AssessmentMeasurementsCard } from '../components/assessments/assessment-measurements-card';
import { AssessmentPhotoList } from '../components/assessments/assessment-photo-list';
import { Card } from '../components/ui/card';
import { InlineMessage } from '../components/ui/inline-message';
import { ContextualHeader, HeaderAction, PageHeader, Screen } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { ApiError } from '../lib/api';
import { colors, spacing, typography } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerAssessmentDetailScreen() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    studentId?: string | string[];
    assessmentId?: string | string[];
  }>();
  const studentId = firstParam(params.studentId);
  const assessmentId = firstParam(params.assessmentId);
  const student = studentId
    ? queryClient.getQueryData<Pick<TrainerStudent, 'name'>>(['trainer', 'student', studentId])
    : undefined;
  const studentName = student?.name.trim() || 'Aluno';
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
      router.dismissTo('/trainer/students');
      return;
    }

    router.dismissTo(`/trainer/students/${studentId}/assessments`);
  }

  if (!studentId || !assessmentId) {
    return (
      <Screen style={styles.centeredState}>
        <PageHeader
          eyebrow="AVALIAÇÕES"
          testID="trainer-assessment-detail-state-header"
          title="Avaliação"
        />
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
        <PageHeader
          eyebrow="AVALIAÇÕES"
          testID="trainer-assessment-detail-state-header"
          title="Avaliação"
        />
        <StatePanel
          description="Estamos carregando os dados desta avaliação."
          title="Carregando avaliação"
          tone="loading"
        />
      </Screen>
    );
  }

  const isNotFound = query.error instanceof ApiError && query.error.status === 404;

  if (isNotFound) {
    return (
      <Screen style={styles.centeredState}>
        <PageHeader
          eyebrow="AVALIAÇÕES"
          testID="trainer-assessment-detail-state-header"
          title="Avaliação"
        />
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
        <PageHeader
          eyebrow="AVALIAÇÕES"
          testID="trainer-assessment-detail-state-header"
          title="Avaliação"
        />
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
        <PageHeader
          eyebrow="AVALIAÇÕES"
          testID="trainer-assessment-detail-state-header"
          title="Avaliação"
        />
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
  const readableDate = formatReadableDate(assessment.date);
  const fullReadableDate = formatFullReadableDate(assessment.date);
  const photos = assessment.photos?.filter((photo) => photo.trim().length > 0) ?? [];

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <AssessmentDetailHeader
        actionDisabled={query.isRefetching}
        actionLabel={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
        onAction={() => void query.refetch()}
        onBack={returnToAssessments}
        testID="trainer-assessment-detail-header"
      />
      <View style={styles.identification}>
        <Text style={styles.detailTitle}>Avaliação de {readableDate}</Text>
        <Text style={styles.detailSubtitle}>{`${fullReadableDate} • ${studentName}`}</Text>
      </View>

      <View style={styles.metrics} testID="trainer-assessment-metrics">
        <AssessmentSummaryCard
          iconName="scale-outline"
          label="Peso"
          support="Medida atual"
          testID="trainer-assessment-summary-card-weight"
          value={formatMetric(assessment.weightKg, 'kg')}
        />
        <AssessmentSummaryCard
          iconName="pie-chart-outline"
          label="Gordura corporal"
          support="Composição corporal"
          testID="trainer-assessment-summary-card-body-fat"
          value={formatMetric(assessment.bodyFatPct, '%')}
        />
      </View>

      <Card style={styles.notesCard}>
        <View style={styles.notesHeader}>
          <Ionicons color="#3498DB" name="document-text-outline" size={18} />
          <Text style={styles.sectionTitle}>Notas do acompanhamento</Text>
        </View>
        <Text style={styles.noteText}>{formatNotes(assessment.notes)}</Text>
      </Card>

      {hasMeasurements(assessment.measurements) ? (
        <AssessmentMeasurementsCard measurements={assessment.measurements} />
      ) : null}

      {photos.length > 0 ? (
        <View style={styles.photos} testID="trainer-assessment-photos">
          <AssessmentPhotoList dateLabel={dateLabel} photos={photos} />
        </View>
      ) : null}

      {query.isRefetchError ? (
        <InlineMessage message="Não foi possível atualizar a avaliação." tone="error" />
      ) : null}
    </Screen>
  );
}

type AssessmentDetailHeaderProps = {
  actionDisabled: boolean;
  actionLabel: string;
  onAction: () => void;
  onBack: () => void;
  testID: string;
};

function AssessmentDetailHeader({
  actionDisabled,
  actionLabel,
  onAction,
  onBack,
  testID,
}: AssessmentDetailHeaderProps) {
  return (
    <ContextualHeader
      action={
        <HeaderAction
          accessibilityLabel={actionLabel}
          disabled={actionDisabled}
          onPress={onAction}
          testID={`${testID}-action`}
        >
          <Ionicons color={colors.muted} name="refresh-outline" size={20} />
        </HeaderAction>
      }
      backAccessibilityLabel="Voltar para avaliações"
      backIcon={<Ionicons color={colors.ink} name="arrow-back" size={20} />}
      backTestID={`${testID}-back`}
      onBack={onBack}
      testID={testID}
      title="Avaliação"
    />
  );
}

type AssessmentSummaryCardProps = {
  iconName: ComponentProps<typeof Ionicons>['name'];
  label: string;
  support: string;
  testID: string;
  value: string;
};

function AssessmentSummaryCard({
  iconName,
  label,
  support,
  testID,
  value,
}: AssessmentSummaryCardProps) {
  return (
    <Card style={styles.summaryCard} testID={testID}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryIcon}>
          <Ionicons color="#3498DB" name={iconName} size={16} />
        </View>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summarySupport}>{support}</Text>
    </Card>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hasMeasurements(value: Assessment['measurements']): boolean {
  return value ? Object.values(value).some((measurement) => Number.isFinite(measurement)) : false;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function formatReadableDate(value: string): string {
  const parsed = parseDate(value);

  if (!parsed) {
    return value;
  }

  return `${parsed.day} de ${MONTHS[parsed.month - 1]}`;
}

function formatFullReadableDate(value: string): string {
  const parsed = parseDate(value);

  if (!parsed) {
    return value;
  }

  return `${parsed.day} de ${MONTHS[parsed.month - 1]} de ${parsed.year}`;
}

function parseDate(value: string): { day: number; month: number; year: string } | null {
  const [year, month, day] = value.split('-');
  const monthNumber = Number(month);
  const dayNumber = Number(day);

  if (!year || !month || !day || !Number.isInteger(monthNumber) || !Number.isInteger(dayNumber)) {
    return null;
  }

  if (!MONTHS[monthNumber - 1] || dayNumber < 1 || dayNumber > 31) {
    return null;
  }

  return { day: dayNumber, month: monthNumber, year };
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
    gap: spacing.lg,
    padding: 20,
    paddingBottom: spacing.xxl,
  },
  detailSubtitle: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 16,
  },
  detailTitle: {
    color: colors.ink,
    fontFamily: typography.exerciseTitle.fontFamily,
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 32,
  },
  identification: {
    gap: 5,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  noteText: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  notesCard: {
    borderRadius: 8,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  notesHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photos: {
    width: '100%',
  },
  summaryCard: {
    borderRadius: 8,
    flex: 1,
    gap: spacing.sm,
    minHeight: 118,
    padding: spacing.lg,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  summaryLabel: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.bodyStrong.fontFamily,
    fontSize: 11,
  },
  summarySupport: {
    color: '#1B7A3D',
    fontFamily: typography.bodyStrong.fontFamily,
    fontSize: 10,
  },
  summaryValue: {
    color: colors.ink,
    fontFamily: typography.exerciseTitle.fontFamily,
    fontSize: 22,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.exerciseTitle.fontFamily,
    fontSize: 15,
    fontWeight: '700',
  },
});
