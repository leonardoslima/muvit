import { Image, StyleSheet, View } from 'react-native';
import { radii, spacing } from '../../lib/styles';

export type AssessmentPhotoListProps = {
  dateLabel: string;
  photos: string[];
};

function createAssessmentPhotoKey(uri: string, position: number): string {
  return `${uri}-${position}`;
}

export function AssessmentPhotoList({ dateLabel, photos }: AssessmentPhotoListProps) {
  return (
    <View style={styles.container}>
      {photos.map((uri, index) => (
        <Image
          accessibilityLabel={`Foto ${index + 1} da avaliação de ${dateLabel}`}
          key={createAssessmentPhotoKey(uri, index)}
          resizeMode="cover"
          source={{ uri }}
          style={styles.photo}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  photo: {
    aspectRatio: 4 / 3,
    borderRadius: radii.md,
    width: '100%',
  },
});
