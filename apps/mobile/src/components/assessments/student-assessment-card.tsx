import { View } from 'react-native';
import type { Assessment } from '../../application/assessments/assessment-data';
import { buildStudentProgressReadout } from '../../application/assessments/student-progress';
import { Card } from '../ui/v2/card';
import { Text } from '../ui/v2/text';
import { AssessmentMeasurementsCard } from './assessment-measurements-card';
import { AssessmentMetric } from './assessment-metric';
import { AssessmentPhotoGrid } from './assessment-photo-grid';

export type StudentAssessmentCardProps = {
  assessment: Assessment;
  previousAssessment?: Assessment;
  onOpenPhoto: (index: number) => void;
};

export function StudentAssessmentCard({
  assessment,
  previousAssessment,
  onOpenPhoto,
}: StudentAssessmentCardProps): React.JSX.Element {
  const readout = buildStudentProgressReadout(assessment, previousAssessment);
  const measurements = assessment.measurements;
  const hasMeasurements = Object.values(measurements ?? {}).some(
    (value) => typeof value === 'number' && Number.isFinite(value),
  );
  const photos = assessment.photos ?? [];

  return (
    <Card
      className="gap-4 rounded-v2-card border-v2-border bg-v2-surface p-5"
      testID={`assessment-card-${assessment.id}`}
    >
      <Text variant="sectionTitle">{readout.dateLabel}</Text>

      <View className="gap-3">
        <View className="flex-row items-start gap-4" testID="student-assessment-primary-metrics">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-v2-secondary" variant="support">
              Peso
            </Text>
            <Text className="font-v2-bold text-v2-text" variant="sectionTitle">
              {readout.weightLabel}
            </Text>
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-v2-secondary" variant="support">
              Gordura corporal
            </Text>
            <Text className="font-v2-bold text-v2-text" variant="sectionTitle">
              {readout.bodyFatLabel}
            </Text>
          </View>
        </View>

        {readout.weightComparison || readout.bodyFatComparison ? (
          <View className="gap-1">
            {readout.weightComparison ? (
              <Text className="text-v2-brand" variant="support">
                Peso: {readout.weightComparison}
              </Text>
            ) : null}
            {readout.bodyFatComparison ? (
              <Text className="text-v2-brand" variant="support">
                Gordura: {readout.bodyFatComparison}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {readout.heightLabel ? <AssessmentMetric label="Altura" value={readout.heightLabel} /> : null}
      {hasMeasurements ? <AssessmentMeasurementsCard measurements={measurements} /> : null}
      {assessment.notes ? <Text className="text-v2-secondary">{assessment.notes}</Text> : null}
      {photos.length > 0 ? (
        <View className="gap-3">
          <Text variant="sectionTitle">Fotos da avaliação</Text>
          <AssessmentPhotoGrid
            onOpen={onOpenPhoto}
            photos={photos.map((uri) => ({ uri }))}
            testID="student-assessment-photos"
          />
        </View>
      ) : null}
    </Card>
  );
}
