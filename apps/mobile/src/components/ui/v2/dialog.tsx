import { type ReactNode, useEffect } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../../lib/design-system/tokens';
import { Card } from './card';
import { Text } from './text';
import { ToastProvider } from './toast';

export type DialogProps = {
  visible: boolean;
  title: string;
  description?: string;
  disabled?: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Dialog({
  visible,
  title,
  description,
  disabled = false,
  onClose,
  children,
}: DialogProps): React.JSX.Element {
  useEffect(() => {
    if (visible) Keyboard.dismiss();
  }, [visible]);
  const close = () => {
    if (!disabled) onClose();
  };
  return (
    <Modal animationType="fade" onRequestClose={close} transparent visible={visible}>
      {visible ? (
        <ToastProvider modal safeAreaView={SafeAreaView}>
          <View style={{ flex: 1 }}>
            <Pressable
              accessible={false}
              disabled={disabled}
              onPress={close}
              className="absolute inset-0"
              style={{ backgroundColor: colors.scrim }}
            />
            <SafeAreaView pointerEvents="box-none" style={{ flex: 1 }}>
              <ScrollView
                pointerEvents="box-none"
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: 'center',
                  padding: spacing.lg,
                }}
                keyboardShouldPersistTaps="handled"
              >
                <Card
                  className="gap-4 rounded-v2-session border-0 p-6"
                  onAccessibilityEscape={close}
                >
                  <Text
                    accessibilityRole="header"
                    variant="sectionTitle"
                    className="text-[22px] leading-[30.8px]"
                  >
                    {title}
                  </Text>
                  {description ? (
                    <Text className="text-v2-secondary text-[15px] leading-[21px]">
                      {description}
                    </Text>
                  ) : null}
                  {children}
                </Card>
              </ScrollView>
            </SafeAreaView>
          </View>
        </ToastProvider>
      ) : null}
    </Modal>
  );
}
