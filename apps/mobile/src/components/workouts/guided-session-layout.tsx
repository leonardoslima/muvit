import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode, Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollView as ScrollViewInstance,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../lib/design-system/tokens';

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
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.sessionBackground }}
    >
      {isFocused ? <StatusBar style={statusBarStyle} /> : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          accessibilityElementsHidden={contentHidden}
          importantForAccessibility={contentHidden ? 'no-hide-descendants' : 'auto'}
          keyboardShouldPersistTaps="handled"
          pointerEvents={contentHidden ? 'none' : 'auto'}
          contentContainerStyle={[
            {
              flexGrow: 1,
              gap: spacing.lg,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg,
            },
            contentContainerStyle,
          ]}
          style={{ flex: 1 }}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
