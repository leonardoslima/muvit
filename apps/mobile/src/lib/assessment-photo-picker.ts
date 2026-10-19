import * as ImagePicker from 'expo-image-picker';

export type AssessmentPhotoSource = 'camera' | 'library';

export class AssessmentPhotoPickerError extends Error {}

export async function pickAssessmentPhotos(
  source: AssessmentPhotoSource,
  {
    libraryOptions,
    isCurrent,
  }: {
    libraryOptions: ImagePicker.ImagePickerOptions;
    isCurrent: () => boolean;
  },
): Promise<ImagePicker.ImagePickerResult | null> {
  if (!isCurrent()) return null;

  try {
    if (source === 'library') return await ImagePicker.launchImageLibraryAsync(libraryOptions);

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!isCurrent()) return null;
    if (!permission.granted) {
      throw new AssessmentPhotoPickerError(
        permission.canAskAgain
          ? 'Permita o acesso à câmera para tirar fotos da avaliação.'
          : 'Ative a permissão da câmera nas configurações do aparelho para tirar fotos da avaliação.',
      );
    }
    return await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });
  } catch (error) {
    if (error instanceof AssessmentPhotoPickerError) throw error;
    throw new AssessmentPhotoPickerError(
      source === 'camera'
        ? 'Não foi possível abrir a câmera. Tente novamente.'
        : 'Não foi possível abrir a biblioteca de fotos. Tente novamente.',
    );
  }
}
