import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';
import {
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sharedStyles, spacing } from '../../lib/styles';

export { ContextualHeader, HeaderAction, PageHeader, SessionHeader } from './header';
export type {
  ContextualHeaderProps,
  HeaderActionProps,
  PageHeaderProps,
  SessionHeaderProps,
} from './header';
export { PageHeader as ScreenHeader } from './header';
export type { PageHeaderProps as ScreenHeaderProps } from './header';

export type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
};

export function Screen({ children, contentContainerStyle, scroll = false, style }: ScreenProps) {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const tabBarInset =
    typeof tabBarHeight === 'number' ? { paddingBottom: tabBarHeight + spacing.lg } : undefined;

  if (!scroll) {
    return <SafeAreaView style={[sharedStyles.screen, style]}>{children}</SafeAreaView>;
  }

  return (
    <SafeAreaView style={sharedStyles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          { gap: spacing.lg, padding: spacing.xxl },
          contentContainerStyle,
          tabBarInset,
        ]}
        style={style}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
