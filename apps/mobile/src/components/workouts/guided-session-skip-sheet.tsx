import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../lib/design-system/tokens';
import { Button } from '../ui/v2/button';
import { SheetSurface } from '../ui/v2/sheet-surface';
import { Text } from '../ui/v2/text';

type GuidedSessionSkipSheetProps = {
  visible: boolean;
  busy: boolean;
  exerciseName: string;
  completedSetCount: number;
  totalSetCount: number;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

export function GuidedSessionSkipSheet({
  visible,
  busy,
  exerciseName,
  completedSetCount,
  totalSetCount,
  onCancel,
  onConfirm,
}: GuidedSessionSkipSheetProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim }}
      >
        <SheetSurface style={{ paddingBottom: Math.max(insets.bottom, spacing.xxl) }}>
          <Text accessibilityRole="header" variant="sectionTitle">
            Pular exercício?
          </Text>
          <Text variant="body">{exerciseName}</Text>
          <Text variant="body">
            {completedSetCount} de {totalSetCount} séries concluídas.
          </Text>
          <Text className="text-v2-secondary" variant="body">
            As séries já realizadas serão mantidas. As restantes serão puladas nesta sessão.
          </Text>
          <Button
            disabled={busy}
            label="Pular exercício"
            loading={busy}
            onPress={() => void onConfirm()}
          />
          <Button
            disabled={busy}
            label="Continuar neste exercício"
            onPress={onCancel}
            variant="secondary"
          />
        </SheetSurface>
      </View>
    </Modal>
  );
}
