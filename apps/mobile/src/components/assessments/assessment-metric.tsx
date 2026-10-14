import { View } from 'react-native';
import { Text } from '../ui/v2/text';

export type AssessmentMetricProps = {
  label: string;
  value: string;
};

export function AssessmentMetric({ label, value }: AssessmentMetricProps): React.JSX.Element {
  return (
    <View className="flex-row items-start justify-between gap-4 py-2">
      <Text className="min-w-0 flex-1 text-v2-secondary">{label}</Text>
      <Text className="min-w-0 flex-1 text-right font-v2-bold">{value}</Text>
    </View>
  );
}
