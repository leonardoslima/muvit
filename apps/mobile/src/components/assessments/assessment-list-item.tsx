import { ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';
import type { Assessment } from '../../application/assessments/assessment-data';
import { colors } from '../../lib/design-system/tokens';
import { Card } from '../ui/v2/card';
import { Text } from '../ui/v2/text';

export type AssessmentListItemProps = {
  assessment: Assessment;
  onPress: () => void;
};

export function AssessmentListItem({
  assessment,
  onPress,
}: AssessmentListItemProps): React.JSX.Element {
  const date = formatDate(assessment.date);

  return (
    <Card
      action={{ label: `Abrir avaliação de ${date}`, onPress }}
      className="gap-4 rounded-v2-card border-v2-border bg-v2-surface p-5"
    >
      <View className="flex-row items-start justify-between gap-4">
        <Text variant="sectionTitle">{date}</Text>
        <ChevronRight accessible={false} color={colors.secondary} size={22} />
      </View>
      <View className="flex-row gap-4">
        <MetricSummary label="Peso" value={formatMetric(assessment.weightKg, 'kg')} />
        <MetricSummary label="Gordura" value={formatMetric(assessment.bodyFatPct, '%')} />
      </View>
      {assessment.notes ? (
        <Text className="text-v2-secondary" numberOfLines={2}>
          {assessment.notes}
        </Text>
      ) : null}
    </Card>
  );
}

function MetricSummary({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text className="text-v2-secondary" variant="support">
        {label}
      </Text>
      <Text className="font-v2-bold">{value}</Text>
    </View>
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
