import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export type AssessmentPhotoSource = 'camera' | 'library';
export type AssessmentPhotoRequest = AssessmentPhotoSource | 'choose';

export class AssessmentPhotoPickerError extends Error {}

export function chooseAssessmentPhotoSource(): Promise<AssessmentPhotoSource | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Adicionar foto',
      'Como deseja adicionar a foto?',
      [
        { text: 'Tirar foto', onPress: () => resolve('camera') },
        { text: 'Escolher da biblioteca', onPress: () => resolve('library') },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

export async function pickAssessmentPhotos(
  request: AssessmentPhotoRequest,
  {
    libraryOptions,
    isCurrent,
  }: {
    libraryOptions: ImagePicker.ImagePickerOptions;
    isCurrent: () => boolean;
  },
): Promise<ImagePicker.ImagePickerResult | null> {
  if (!isCurrent()) return null;
  const source = request === 'choose' ? await chooseAssessmentPhotoSource() : request;
  if (!source || !isCurrent()) return null;

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
