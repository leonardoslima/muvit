import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/styles';
import { Card } from '../ui/card';

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
        <Card
          key={createAssessmentPhotoKey(uri, index)}
          style={styles.photoCard}
          testID={`assessment-photo-card-${index + 1}`}
        >
          <View style={styles.photoPreview} testID={`assessment-photo-preview-${index + 1}`}>
            <Ionicons color="#3498DB" name="image-outline" size={28} />
            <Image
              accessibilityLabel={`Foto ${index + 1} da avaliação de ${dateLabel}`}
              resizeMode="cover"
              source={{ uri }}
              style={styles.photo}
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>
              {index === 0 ? 'Foto de evolução' : `Foto de evolução ${index + 1}`}
            </Text>
            <Text style={styles.description}>
              {index === 0
                ? 'Vista frontal • registrada nesta avaliação'
                : 'Vista posterior • registrada nesta avaliação'}
            </Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  description: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  photoCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    height: 128,
    padding: spacing.lg,
    borderRadius: 8,
  },
  photo: {
    borderRadius: 4,
    height: 94,
    position: 'absolute',
    width: 94,
  },
  photoPreview: {
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: 4,
    height: 94,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 94,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.exerciseTitle.fontFamily,
    fontSize: 15,
    fontWeight: '700',
  },
});
