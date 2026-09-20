import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Assessment } from '../../application/assessments/assessment-data';
import { colors, radii, spacing, typography } from '../../lib/styles';
import { Card } from '../ui/card';

export type AssessmentListItemProps = {
  assessment: Assessment;
  onPress: () => void;
};

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

const SHORT_MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

export function AssessmentListItem({ assessment, onPress }: AssessmentListItemProps) {
  const date = formatDate(assessment.date);
  const readableDate = formatReadableDate(assessment.date);
  const compactDate = formatCompactDate(assessment.date);
  const weight = formatMetric(assessment.weightKg, 'kg');
  const bodyFat = formatMetric(assessment.bodyFatPct, '%');
  const notes = assessment.notes?.trim();
  const evolution = notes || 'Avaliação registrada';

  return (
    <Pressable
      accessible
      accessibilityLabel={`Abrir avaliação de ${date}, peso: ${weight}, gordura corporal: ${bodyFat}${notes ? `, observações: ${notes}` : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}
    >
      <Card style={styles.card} testID="assessment-list-card">
        <View style={styles.header} testID="assessment-list-header">
          <View style={styles.iconBubble}>
            <Ionicons
              color="#3498DB"
              name="stats-chart-outline"
              size={18}
              testID="assessment-list-icon"
            />
          </View>
          <View style={styles.identity}>
            <Text style={styles.title}>Avaliação de {readableDate}</Text>
            <Text style={styles.date}>{compactDate}</Text>
          </View>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Gordura corporal</Text>
          <Text style={styles.metricValue}>{bodyFat}</Text>
        </View>
        <View style={styles.evolutionRow}>
          <Text style={styles.evolutionValue}>{weight}</Text>
          <Text style={styles.evolutionText}> • {evolution}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatReadableDate(value: string): string {
  const parsed = parseDate(value);

  if (!parsed) {
    return value;
  }

  return `${parsed.day} de ${MONTHS[parsed.month - 1]}`;
}

function formatCompactDate(value: string): string {
  const parsed = parseDate(value);

  if (!parsed) {
    return value;
  }

  return `${parsed.day} ${SHORT_MONTHS[parsed.month - 1]} ${parsed.year}`;
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

function formatMetric(value: string | number | null, unit: string): string {
  if (value === null) return 'Não informado';

  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return 'Não informado';

  const formatted = number.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return unit === '%' ? `${formatted}%` : `${formatted} ${unit}`;
}

const styles = StyleSheet.create({
  date: {
    color: colors.muted,
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
  },
  evolutionRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  evolutionText: {
    color: '#1B7A3D',
    fontFamily: typography.bodyStrong.fontFamily,
    fontSize: 12,
  },
  evolutionValue: {
    color: '#1B7A3D',
    fontFamily: typography.bodyStrong.fontFamily,
    fontSize: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
  },
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  metricValue: {
    color: colors.ink,
    fontFamily: typography.exerciseTitle.fontFamily,
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    borderRadius: 8,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.8,
  },
  pressable: {
    borderRadius: 8,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.exerciseTitle.fontFamily,
    fontSize: 16,
    fontWeight: '700',
  },
});
