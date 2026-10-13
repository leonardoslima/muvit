import { Image, View } from 'react-native';
import { radii } from '../../lib/design-system/tokens';
import { Text } from '../ui/v2/text';

export type AssessmentPhotoListProps = {
  dateLabel: string;
  photos: string[];
};

function createAssessmentPhotoKey(uri: string, position: number): string {
  return `${uri}-${position}`;
}

export function AssessmentPhotoList({
  dateLabel,
  photos,
}: AssessmentPhotoListProps): React.JSX.Element {
  return (
    <View className="gap-4">
      {photos.map((uri, index) => (
        <View className="gap-2" key={createAssessmentPhotoKey(uri, index)}>
          <Text className="text-v2-secondary" variant="support">
            Foto {index + 1}
          </Text>
          <Image
            accessibilityLabel={`Foto ${index + 1} da avaliação de ${dateLabel}`}
            resizeMode="contain"
            source={{ uri }}
            style={{ aspectRatio: 4 / 3, borderRadius: radii.card, width: '100%' }}
          />
        </View>
      ))}
    </View>
  );
}
