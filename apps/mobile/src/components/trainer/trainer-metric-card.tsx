import { StyleSheet, Text } from 'react-native';
import { colors, sharedStyles, spacing, typography } from '../../lib/styles';
import { Card } from '../ui/card';

export type TrainerMetricCardProps = {
  label: string;
  value: number;
  description?: string;
};

export function TrainerMetricCard({ description, label, value }: TrainerMetricCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={sharedStyles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {description ? <Text style={sharedStyles.subtitle}>{description}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    minWidth: 140,
  },
  value: {
    color: colors.ink,
    ...typography.headline,
    marginTop: spacing.xs,
  },
});
