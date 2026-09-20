import { StyleSheet, Text, View } from 'react-native';
import type { Assessment } from '../../application/assessments/assessment-data';
import { colors, radii, sharedStyles, spacing, typography } from '../../lib/styles';
import { Card } from '../ui/card';
import { AssessmentMetric } from './assessment-metric';

const MEASUREMENTS = [
  ['Peito', 'chest'],
  ['Cintura', 'waist'],
  ['Quadril', 'hip'],
  ['Braço direito', 'armRight'],
  ['Braço esquerdo', 'armLeft'],
  ['Coxa direita', 'thighRight'],
  ['Coxa esquerda', 'thighLeft'],
  ['Panturrilha direita', 'calfRight'],
  ['Panturrilha esquerda', 'calfLeft'],
] as const;

type MeasurementKey = (typeof MEASUREMENTS)[number][1];
type AssessmentMeasurements = NonNullable<Assessment['measurements']>;

export type AssessmentMeasurementsCardProps = {
  measurements: Assessment['measurements'];
};

export function AssessmentMeasurementsCard({ measurements }: AssessmentMeasurementsCardProps) {
  const normalizedMeasurements: AssessmentMeasurements = measurements ?? {};
  const availableMeasurements = MEASUREMENTS.filter(
    ([, key]) => normalizedMeasurements[key] !== undefined,
  );

  return (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>Medidas de circunferência</Text>
      {availableMeasurements.length === 0 ? (
        <Text style={sharedStyles.subtitle}>Não informado</Text>
      ) : (
        <View style={styles.grid}>
          {availableMeasurements.map(([label, key]) => (
            <View key={key} style={styles.measurement}>
              <AssessmentMetric
                label={label}
                value={formatMeasurement(normalizedMeasurements, key)}
              />
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function formatMeasurement(measurements: AssessmentMeasurements, key: MeasurementKey): string {
  const value = measurements[key];

  if (value === undefined || !Number.isFinite(value)) {
    return 'Não informado';
  }

  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} cm`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  measurement: {
    width: '48%',
  },
  sectionTitle: {
    color: colors.ink,
    ...typography.cardTitle,
  },
});
