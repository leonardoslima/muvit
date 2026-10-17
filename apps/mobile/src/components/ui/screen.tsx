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
import { colors, spacing, tabBarLayout } from '../../lib/design-system/tokens';
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
  const tabBarInset = inTabs
    ? { paddingBottom: tabBarHeight + tabBarLayout.offset + tabBarLayout.contentGap }
    : undefined;

  if (!scroll) {
    return (
      <SafeAreaView
        edges={safeAreaEdges}
        style={[
          {
            flex: 1,
            backgroundColor: colors.background,
            paddingVertical: spacing.xxl,
            paddingHorizontal: spacing.lg,
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
    <SafeAreaView edges={safeAreaEdges} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          {
            gap: spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.xxl,
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
    <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
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
