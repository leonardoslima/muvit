import { useContext } from 'react';
import {
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '../../../node_modules/@react-navigation/bottom-tabs/src/utils/BottomTabBarHeightContext';
import { colors, fontFamilies, sharedStyles, spacing } from '../../lib/styles';

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

export type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ eyebrow, subtitle, title }: ScreenHeaderProps) {
  return (
    <View style={sharedStyles.header}>
      {eyebrow ? <Text style={sharedStyles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={sharedStyles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            color: colors.muted,
            fontFamily: fontFamilies.body,
            fontSize: 15,
            lineHeight: 22,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
