import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Image, Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, controlSizes } from '../../lib/design-system/tokens';
import { Header } from '../ui/v2/header';
import { IconButton } from '../ui/v2/icon-button';

export type AssessmentPhotoViewerProps = {
  photos: readonly string[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

export function AssessmentPhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
}: AssessmentPhotoViewerProps): React.JSX.Element | null {
  const isOpen = index !== null && Number.isInteger(index) && index >= 0 && index < photos.length;
  if (!isOpen || index === null) return null;

  const isFirst = index === 0;
  const isLast = index === photos.length - 1;
  const showNavigation = photos.length > 1;

  return (
    <Modal animationType="fade" onRequestClose={onClose} visible>
      <SafeAreaView
        accessibilityViewIsModal
        aria-modal
        edges={['top', 'right', 'bottom', 'left']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <View className="gap-4 px-4 pb-4 pt-4" style={{ flex: 1 }}>
          <Header
            backAction={{ label: 'Fechar fotos', onPress: onClose }}
            title={`Foto ${index + 1} de ${photos.length}`}
            variant="contextual"
          />
          <View className="flex-1 items-center justify-center">
            <Image
              accessible
              accessibilityLabel={`Prévia ampliada da foto ${index + 1}`}
              resizeMode="contain"
              source={{ uri: photos[index] }}
              style={{ height: '100%', width: '100%' }}
            />
          </View>
          {showNavigation ? (
            <View className="flex-row items-center justify-between">
              <IconButton
                accessibilityLabel="Foto anterior"
                disabled={isFirst}
                icon={
                  <ChevronLeft
                    color={isFirst ? colors.secondary : colors.brand}
                    size={controlSizes.icon}
                  />
                }
                onPress={() => onIndexChange(index - 1)}
              />
              <IconButton
                accessibilityLabel="Próxima foto"
                disabled={isLast}
                icon={
                  <ChevronRight
                    color={isLast ? colors.secondary : colors.brand}
                    size={controlSizes.icon}
                  />
                }
                onPress={() => onIndexChange(index + 1)}
              />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
