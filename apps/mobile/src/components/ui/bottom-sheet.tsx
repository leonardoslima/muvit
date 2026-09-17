import type { ReactNode } from 'react';
import { Modal, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      navigationBarTranslucent
      onRequestClose={onRequestClose ?? onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.backdrop} testID="bottom-sheet-backdrop">
        <Pressable
          onPress={(event) => event?.stopPropagation()}
          style={[styles.surface, style]}
          testID="bottom-sheet-surface"
        >
          {showHandle ? <View style={styles.handle} testID="bottom-sheet-handle" /> : null}
          <SafeAreaView edges={['bottom']} style={styles.content}>
            {children}
          </SafeAreaView>
        </Pressable>
      </Pressable>
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
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  content: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
});
