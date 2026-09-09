import { StyleSheet, Text, View } from 'react-native';
import type { Assessment } from '../../application/assessments/assessment-data';
import { colors, sharedStyles, spacing, typography } from '../../lib/styles';
import { PressableCard } from '../ui/pressable-card';

export type AssessmentListItemProps = {
  assessment: Assessment;
  onPress: () => void;
};

export function AssessmentListItem({ assessment, onPress }: AssessmentListItemProps) {
  const date = formatDate(assessment.date);
  const weight = formatMetric(assessment.weightKg, 'kg');
  const bodyFat = formatMetric(assessment.bodyFatPct, '%');
  const notes = assessment.notes ? `, observações: ${assessment.notes}` : '';

  return (
    <PressableCard
      accessibilityLabel={`Abrir avaliação de ${date}, peso: ${weight}, gordura corporal: ${bodyFat}${notes}`}
      onPress={onPress}
    >
      <>
        <Text style={styles.date}>{date}</Text>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={sharedStyles.label}>Peso</Text>
            <Text style={sharedStyles.subtitle}>{weight}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={sharedStyles.label}>Gordura</Text>
            <Text style={sharedStyles.subtitle}>{bodyFat}</Text>
          </View>
        </View>
        {assessment.notes ? (
          <Text numberOfLines={2} style={sharedStyles.subtitle}>
            {assessment.notes}
          </Text>
        ) : null}
      </>
    </PressableCard>
  );
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatMetric(value: string | number | null, unit: string): string {
  if (value === null) return 'Não informado';

  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return 'Não informado';

  const formatted = number.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return unit === '%' ? `${formatted}%` : `${formatted} ${unit}`;
}

const styles = StyleSheet.create({
  date: {
    color: colors.ink,
    ...typography.cardTitle,
  },
  metrics: {
    gap: spacing.xs,
  },
  metric: {
    gap: spacing.xs,
  },
});
