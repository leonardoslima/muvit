import { StyleSheet, Text } from 'react-native';
import type { Assessment } from '../../application/assessments/assessment-data';
import { colors, sharedStyles, typography } from '../../lib/styles';
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
    <Card>
      <Text style={styles.sectionTitle}>Medidas de circunferência</Text>
      {availableMeasurements.length === 0 ? (
        <Text style={sharedStyles.subtitle}>Não informado</Text>
      ) : (
        availableMeasurements.map(([label, key]) => (
          <AssessmentMetric
            key={key}
            label={label}
            value={formatMeasurement(normalizedMeasurements, key)}
          />
        ))
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
  sectionTitle: {
    color: colors.ink,
    ...typography.cardTitle,
  },
});
