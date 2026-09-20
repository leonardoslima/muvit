import { Ionicons } from '@expo/vector-icons';
import type { assessmentSchema } from '@muvit/validators';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, type PressableProps, StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';

import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Screen, ScreenHeader } from '../components/ui/screen';
import {
  colors,
  controlSizes,
  fontFamilies,
  radii,
  sharedStyles,
  spacing,
  typography,
} from '../lib/styles';
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
      <ScreenHeader
        action={
          <Link asChild href="/new-assessment">
            <NewAssessmentAction />
          </Link>
        }
        eyebrow="PROGRESSO"
        subtitle="Sua evolução, avaliação por avaliação."
        testID="progress-header"
        title="Progresso"
      />

      {query.isLoading ? (
        <ProgressStatePanel
          description="Estamos buscando suas avaliações mais recentes."
          title="Carregando progresso"
          tone="loading"
        />
      ) : null}

      {query.isError ? (
        <ProgressStatePanel
          actionLabel="Tentar novamente"
          description="Verifique sua conexão e tente novamente."
          onAction={() => void query.refetch()}
          title="Não foi possível carregar seu progresso"
          tone="error"
        />
      ) : null}

      {query.data?.items.length === 0 ? (
        <ProgressStatePanel
          description="Registre uma avaliação para acompanhar sua evolução."
          title="Nenhuma avaliação registrada"
          tone="empty"
        />
      ) : null}

      {query.data?.items.map((assessment: Assessment, index: number) => (
        <AssessmentCard
          assessment={assessment}
          isCurrent={index === 0}
          key={assessment.id}
          previousAssessment={query.data?.items[index + 1]}
        />
      ))}
    </Screen>
  );
}

function NewAssessmentAction({ onPress }: { onPress?: PressableProps['onPress'] }) {
  return (
    <Pressable
      accessible
      accessibilityLabel="Nova avaliação"
      accessibilityRole="button"
      accessibilityState={{ disabled: false }}
      onPress={onPress}
      style={({ pressed }) => [styles.newAssessmentAction, pressed ? styles.pressed : null]}
      testID="new-assessment-action"
    >
      <Ionicons color={colors.surface} name="add" size={22} />
    </Pressable>
  );
}

function AssessmentCard({
  assessment,
  isCurrent,
  previousAssessment,
}: {
  assessment: Assessment;
  isCurrent: boolean;
  previousAssessment?: Assessment;
}) {
  const weight = toNumber(assessment.weightKg);
  const bodyFat = toNumber(assessment.bodyFatPct);
  const previousWeight = toNumber(previousAssessment?.weightKg);
  const previousBodyFat = toNumber(previousAssessment?.bodyFatPct);
  const comparison = [
    weight !== null && previousWeight !== null ? formatDelta(weight - previousWeight, 'kg') : null,
    bodyFat !== null && previousBodyFat !== null
      ? formatDelta(bodyFat - previousBodyFat, 'p.p.')
      : null,
  ]
    .filter((value): value is string => value !== null)
    .join(' · ');
  const evolutionLabel = isCurrent
    ? 'Referência atual'
    : comparison || (previousAssessment ? undefined : 'Início do acompanhamento');

  return (
    <Card style={styles.assessmentCard} testID={`assessment-card-${assessment.id}`}>
      <View style={styles.assessmentHeader}>
        <View style={styles.assessmentIcon} testID={`assessment-icon-${assessment.id}`}>
          <Ionicons color={colors.primaryText} name="stats-chart-outline" size={18} />
        </View>
        <View style={styles.assessmentIdentity}>
          <Text style={styles.assessmentTitle}>Avaliação física</Text>
          <Text style={styles.assessmentDate}>{formatDate(assessment.date)}</Text>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={`Peso: ${formatMetric(weight, 'kg')}; Gordura corporal: ${formatBodyFat(bodyFat)}`}
        style={styles.metricSummary}
      >
        <View style={styles.metricLabels}>
          <Text style={styles.metricLabel}>Peso</Text>
          <Text style={styles.metricSeparator}> · </Text>
          <Text style={styles.metricLabel}>Gordura corporal</Text>
        </View>
        <View style={styles.metricValues}>
          <Text style={styles.metricValue}>{formatMetric(weight, 'kg')}</Text>
          <Text style={styles.metricSeparator}> · </Text>
          <Text style={styles.metricValue}>{formatBodyFat(bodyFat)}</Text>
        </View>
      </View>
      {evolutionLabel ? <Text style={styles.comparison}>{evolutionLabel}</Text> : null}
      {assessment.notes ? <Text style={sharedStyles.subtitle}>{assessment.notes}</Text> : null}
    </Card>
  );
}

function ProgressStatePanel({
  actionLabel,
  description,
  onAction,
  title,
  tone,
}: {
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
  tone: 'loading' | 'empty' | 'error';
}) {
  const isError = tone === 'error';
  const iconName =
    tone === 'loading'
      ? 'refresh-outline'
      : tone === 'empty'
        ? 'clipboard-outline'
        : 'warning-outline';

  return (
    <Card style={styles.stateCard} testID={`progress-state-${tone}`}>
      <View
        accessibilityLabel={tone === 'loading' ? 'Carregando' : undefined}
        accessibilityRole={tone === 'loading' ? 'progressbar' : undefined}
        style={[styles.stateIcon, isError ? styles.stateIconError : null]}
      >
        <Ionicons
          color={isError ? colors.dangerText : colors.primaryText}
          name={iconName}
          size={20}
        />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {actionLabel && onAction ? (
        <View style={styles.stateAction}>
          <AppButton
            label={actionLabel}
            onPress={onAction}
            trailingIcon={<Ionicons color={colors.ink} name="refresh-outline" size={18} />}
          />
        </View>
      ) : null}
    </Card>
  );
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
  return value === null ? '—' : `${formatNumber(value)}%`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function formatDelta(delta: number, unit: string): string {
  if (delta === 0) return `Sem alteração em ${unit}`;
  const direction = delta < 0 ? '−' : '+';
  return `${direction}${formatNumber(Math.abs(delta))} ${unit}`;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  newAssessmentAction: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: controlSizes.touchTarget,
    justifyContent: 'center',
    width: controlSizes.touchTarget,
  },
  pressed: {
    opacity: 0.8,
  },
  assessmentCard: {
    gap: spacing.sm,
  },
  assessmentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  assessmentIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: spacing.xxxl + spacing.xs,
    justifyContent: 'center',
    width: spacing.xxxl + spacing.xs,
  },
  assessmentIdentity: {
    flex: 1,
    gap: 2,
  },
  assessmentTitle: {
    color: colors.ink,
    ...typography.cardTitle,
    fontFamily: fontFamilies.heading,
  },
  assessmentDate: {
    color: colors.muted,
    ...typography.caption,
  },
  metricSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: spacing.xxxl + spacing.xs,
  },
  metricLabels: {
    flexDirection: 'row',
    flexShrink: 1,
  },
  metricLabel: {
    color: colors.muted,
    ...typography.caption,
  },
  metricSeparator: {
    color: colors.muted,
    ...typography.caption,
  },
  metricValues: {
    flexDirection: 'row',
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  metricValue: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: typography.exerciseTitle.fontSize,
  },
  comparison: {
    color: colors.primaryText,
    ...typography.bodyStrong,
    fontSize: typography.caption.fontSize,
  },
  stateCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: spacing.xxxl + spacing.xs,
    justifyContent: 'center',
    width: spacing.xxxl + spacing.xs,
  },
  stateIconError: {
    backgroundColor: colors.dangerSoft,
  },
  stateTitle: {
    color: colors.ink,
    ...typography.cardTitle,
    fontFamily: fontFamilies.heading,
    textAlign: 'center',
  },
  stateDescription: {
    color: colors.muted,
    ...typography.caption,
    textAlign: 'center',
  },
  stateAction: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
