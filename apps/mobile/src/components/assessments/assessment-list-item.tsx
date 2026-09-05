import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Assessment } from '../../application/assessments/assessment-data';
import { colors, radii, sharedStyles, spacing, typography } from '../../lib/styles';
import { Card } from '../ui/card';

export type AssessmentListItemProps = {
  assessment: Assessment;
  onPress: () => void;
};

export function AssessmentListItem({ assessment, onPress }: AssessmentListItemProps) {
  const date = formatDate(assessment.date);

  return (
    <Pressable
      accessible
      accessibilityLabel={`Abrir avaliação de ${date}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}
    >
      <Card>
        <Text style={styles.date}>{date}</Text>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={sharedStyles.label}>Peso</Text>
            <Text style={sharedStyles.subtitle}>{formatMetric(assessment.weightKg, 'kg')}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={sharedStyles.label}>Gordura</Text>
            <Text style={sharedStyles.subtitle}>{formatMetric(assessment.bodyFatPct, '%')}</Text>
          </View>
        </View>
        {assessment.notes ? (
          <Text numberOfLines={2} style={sharedStyles.subtitle}>
            {assessment.notes}
          </Text>
        ) : null}
      </Card>
    </Pressable>
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
  pressable: {
    borderRadius: radii.lg,
  },
  pressed: {
    opacity: 0.8,
  },
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
