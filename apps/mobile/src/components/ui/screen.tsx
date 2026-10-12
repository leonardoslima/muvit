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
import { v2Colors, v2Spacing } from '../../lib/design-system/tokens';
import { sharedStyles } from '../../lib/styles';
import { Header as V2Header } from './v2/header';
import { Text as V2Text } from './v2/text';

export type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
};

export function Screen({ children, contentContainerStyle, scroll = false, style }: ScreenProps) {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const inTabs = typeof tabBarHeight === 'number';
  const safeAreaEdges: ('top' | 'right' | 'bottom' | 'left')[] = inTabs
    ? ['top', 'left', 'right']
    : ['top', 'right', 'bottom', 'left'];
  const tabBarInset = inTabs ? { paddingBottom: tabBarHeight + v2Spacing.lg } : undefined;

  if (!scroll) {
    return (
      <SafeAreaView
        edges={safeAreaEdges}
        style={[
          sharedStyles.screen,
          {
            backgroundColor: v2Colors.background,
            paddingHorizontal: v2Spacing.lg,
          },
          style,
          tabBarInset,
        ]}
      >
        {children}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[sharedStyles.safeArea, { backgroundColor: v2Colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          {
            gap: v2Spacing.lg,
            paddingHorizontal: v2Spacing.lg,
            paddingVertical: v2Spacing.xxl,
          },
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

export type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ eyebrow, subtitle, title }: ScreenHeaderProps) {
  return (
    <View style={sharedStyles.header}>
      {eyebrow ? (
        <V2Text className="text-v2-brand uppercase tracking-[1px]" variant="caption">
          {eyebrow}
        </V2Text>
      ) : null}
      <V2Header title={title} />
      {subtitle ? (
        <V2Text className="text-v2-secondary" variant="body">
          {subtitle}
        </V2Text>
      ) : null}
    </View>
  );
}
