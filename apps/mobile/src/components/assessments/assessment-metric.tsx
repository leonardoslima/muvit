import { Text, View } from 'react-native';
import { sharedStyles } from '../../lib/styles';

export type AssessmentMetricProps = {
  label: string;
  value: string;
};

export function AssessmentMetric({ label, value }: AssessmentMetricProps) {
  return (
    <View>
      <Text style={sharedStyles.label}>{label}</Text>
      <Text style={sharedStyles.subtitle}>{value}</Text>
    </View>
  );
}
