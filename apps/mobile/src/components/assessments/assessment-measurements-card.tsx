import { View } from 'react-native';
import type { Assessment } from '../../application/assessments/assessment-data';
import { Text } from '../ui/v2/text';
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

export function AssessmentMeasurementsCard({
  measurements,
}: AssessmentMeasurementsCardProps): React.JSX.Element {
  const normalizedMeasurements: AssessmentMeasurements = measurements ?? {};
  const availableMeasurements = MEASUREMENTS.filter(
    ([, key]) => normalizedMeasurements[key] !== undefined,
  );

  return (
    <View className="gap-3">
      <Text variant="sectionTitle">Medidas de circunferência</Text>
      {availableMeasurements.length === 0 ? (
        <Text className="text-v2-secondary">Não informado</Text>
      ) : (
        <View className="gap-1">
          {availableMeasurements.map(([label, key]) => (
            <AssessmentMetric
              key={key}
              label={label}
              value={formatMeasurement(normalizedMeasurements, key)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function formatMeasurement(measurements: AssessmentMeasurements, key: MeasurementKey): string {
  const value = measurements[key];

  if (value === undefined || !Number.isFinite(value)) {
    return 'Não informado';
  }

  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} cm`;
}
