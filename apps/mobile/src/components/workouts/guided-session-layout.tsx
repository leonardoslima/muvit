import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode, Ref } from 'react';
import type { ScrollView as ScrollViewInstance, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../lib/design-system/tokens';
import { KeyboardScrollView } from '../ui/v2/keyboard-scroll-view';
import { ToastProvider } from '../ui/v2/toast';

export type GuidedSessionLayoutProps = {
  children: ReactNode;
  contentHidden?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollRef?: Ref<ScrollViewInstance>;
  statusBarStyle?: 'light' | 'dark';
};

export function GuidedSessionLayout({
  children,
  contentHidden = false,
  contentContainerStyle,
  scrollRef,
  statusBarStyle = 'light',
}: GuidedSessionLayoutProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  return (
    <ToastProvider safeAreaView={SafeAreaView}>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={{ flex: 1, backgroundColor: colors.sessionBackground }}
      >
        {isFocused ? <StatusBar style={statusBarStyle} /> : null}
        <KeyboardScrollView
          ref={scrollRef}
          accessibilityElementsHidden={contentHidden}
          importantForAccessibility={contentHidden ? 'no-hide-descendants' : 'auto'}
          keyboardShouldPersistTaps="handled"
          pointerEvents={contentHidden ? 'none' : 'auto'}
          contentContainerStyle={[
            {
              flexGrow: 1,
              gap: spacing.xl,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.xl,
              paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg,
            },
            contentContainerStyle,
          ]}
          style={{ flex: 1 }}
        >
          {children}
        </KeyboardScrollView>
      </SafeAreaView>
    </ToastProvider>
  );
}
