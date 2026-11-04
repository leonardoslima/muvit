import { Camera, Images } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Keyboard, Modal, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AssessmentPhotoSource } from '../../lib/assessment-photo-picker';
import { colors } from '../../lib/design-system/tokens';
import { Button, SheetSurface, Text } from '../ui/v2';

type AssessmentPhotoSourceSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (source: AssessmentPhotoSource) => void;
};

export function AssessmentPhotoSourceSheet({
  visible,
  onClose,
  onSelect,
}: AssessmentPhotoSourceSheetProps): React.JSX.Element | null {
  const pendingSource = useRef<AssessmentPhotoSource | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    if (visible) Keyboard.dismiss();
  }, [visible]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const finishSelection = () => {
    const source = pendingSource.current;
    pendingSource.current = null;
    if (source && mounted.current) onSelect(source);
  };
  const select = (source: AssessmentPhotoSource) => {
    pendingSource.current = source;
    onClose();
    // No iOS, o picker só pode ser apresentado após dispensar o modal nativo.
    if (Platform.OS !== 'ios') finishSelection();
  };
  const cancel = () => {
    pendingSource.current = null;
    onClose();
  };

  if (!visible && !pendingSource.current) return null;
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={cancel}
      onDismiss={finishSelection}
      testID="assessment-photo-source-modal"
    >
      <View
        accessibilityViewIsModal
        className="flex-1 justify-end"
        style={{ backgroundColor: colors.scrim }}
      >
        <SheetSurface>
          <SafeAreaView edges={['bottom']} className="gap-4">
            <Text accessibilityRole="header" variant="sectionTitle">
              Adicionar foto
            </Text>
            <Text className="text-v2-secondary">Como deseja adicionar a foto?</Text>
            <Button
              label="Tirar foto"
              variant="secondary"
              leading={<Camera accessible={false} color={colors.brand} size={22} />}
              onPress={() => select('camera')}
            />
            <Button
              label="Escolher da biblioteca"
              variant="secondary"
              leading={<Images accessible={false} color={colors.brand} size={22} />}
              onPress={() => select('library')}
            />
            <Button label="Cancelar" variant="text" onPress={cancel} />
          </SafeAreaView>
        </SheetSurface>
      </View>
    </Modal>
  );
}
