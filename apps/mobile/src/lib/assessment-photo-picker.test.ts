import { Alert } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chooseAssessmentPhotoSource, pickAssessmentPhotos } from './assessment-photo-picker';

const picker = vi.hoisted(() => ({
  requestCameraPermissionsAsync: vi.fn(),
  launchCameraAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
}));
vi.mock('expo-image-picker', () => picker);
const captured = {
  canceled: false,
  assets: [{ uri: 'file:///camera.jpg', mimeType: 'image/jpeg' }],
};
const options = { libraryOptions: { allowsEditing: true, quality: 0.7 }, isCurrent: () => true };

beforeEach(() => {
  picker.requestCameraPermissionsAsync.mockReset().mockResolvedValue({ granted: true });
  picker.launchCameraAsync.mockReset().mockResolvedValue(captured);
  picker.launchImageLibraryAsync.mockReset().mockResolvedValue(captured);
});
afterEach(() => vi.restoreAllMocks());

describe('fotos da avaliação', () => {
  it.each([
    ['Tirar foto', 'camera'],
    ['Escolher da biblioteca', 'library'],
    ['Cancelar', null],
  ])('oferece %s sem abrir a câmera ou biblioteca antes da escolha', async (label, source) => {
    const alert = vi.spyOn(Alert, 'alert');
    const choice = chooseAssessmentPhotoSource();
    const buttons = alert.mock.calls[0]?.[2];
    expect(buttons?.map((button) => button.text)).toEqual([
      'Tirar foto',
      'Escolher da biblioteca',
      'Cancelar',
    ]);
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
    buttons?.find((button) => button.text === label)?.onPress?.();
    expect(await choice).toBe(source);
  });

  it('trata o fechamento do menu pelo sistema como cancelamento', async () => {
    const alert = vi.spyOn(Alert, 'alert');
    const choice = chooseAssessmentPhotoSource();
    alert.mock.calls[0]?.[3]?.onDismiss?.();
    expect(await choice).toBeNull();
  });

  it('ignora uma escolha feita depois de sair da tela, sem solicitar permissão', async () => {
    const alert = vi.spyOn(Alert, 'alert');
    let current = true;
    const pending = pickAssessmentPhotos('choose', { ...options, isCurrent: () => current });
    current = false;
    alert.mock.calls[0]?.[2]?.find((button) => button.text === 'Tirar foto')?.onPress?.();
    expect(await pending).toBeNull();
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('pede permissão e captura somente imagens quando autorizado', async () => {
    expect(await pickAssessmentPhotos('camera', options)).toEqual(captured);
    expect(picker.requestCameraPermissionsAsync).toHaveBeenCalledOnce();
    expect(picker.launchCameraAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it.each([
    [true, 'Permita o acesso à câmera para tirar fotos da avaliação.'],
    [
      false,
      'Ative a permissão da câmera nas configurações do aparelho para tirar fotos da avaliação.',
    ],
  ])(
    'informa a permissão negada com canAskAgain=%s sem abrir a câmera',
    async (canAskAgain, message) => {
      picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain });
      await expect(pickAssessmentPhotos('camera', options)).rejects.toThrow(message);
      expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    },
  );

  it('não solicita câmera ao escolher a biblioteca e preserva suas opções', async () => {
    expect(await pickAssessmentPhotos('library', options)).toEqual(captured);
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(options.libraryOptions);
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  });

  it('ignora a permissão resolvida depois que a tela deixa de estar ativa', async () => {
    let resolvePermission: (value: { granted: boolean }) => void = () => undefined;
    let current = true;
    picker.requestCameraPermissionsAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePermission = resolve;
        }),
    );
    const pending = pickAssessmentPhotos('camera', { ...options, isCurrent: () => current });
    current = false;
    resolvePermission({ granted: true });
    expect(await pending).toBeNull();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('explica falha da câmera e permite que uma nova tentativa funcione', async () => {
    picker.launchCameraAsync.mockRejectedValueOnce(new Error('camera unavailable'));
    await expect(pickAssessmentPhotos('camera', options)).rejects.toThrow(
      'Não foi possível abrir a câmera. Tente novamente.',
    );
    expect(await pickAssessmentPhotos('camera', options)).toEqual(captured);
  });
});
