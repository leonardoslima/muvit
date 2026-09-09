import type { ReactNode } from 'react';
import { Modal, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, controlSizes, radii, spacing } from '../../lib/styles';

export type BottomSheetProps = {
  children: ReactNode;
  onClose: () => void;
  onRequestClose?: () => void;
  showHandle?: boolean;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
};

export function BottomSheet({
  children,
  onClose,
  onRequestClose,
  showHandle = false,
  style,
  visible,
}: BottomSheetProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onRequestClose ?? onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={[styles.surface, style]}>
          {showHandle ? <View style={styles.handle} testID="bottom-sheet-handle" /> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'flex-end',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.muted,
    borderRadius: radii.handle,
    height: controlSizes.sheetHandleHeight,
    width: controlSizes.sheetHandleWidth,
  },
  surface: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    gap: spacing.md,
    padding: spacing.xxl,
  },
});
