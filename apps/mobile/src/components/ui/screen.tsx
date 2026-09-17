import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
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
import { sharedStyles, spacing } from '../../lib/styles';

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
  centered?: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ centered = false, eyebrow, subtitle, title }: ScreenHeaderProps) {
  const centeredTextStyle = centered ? styles.centeredHeaderText : null;

  return (
    <View style={[sharedStyles.header, centered ? styles.centeredHeader : null]}>
      {eyebrow ? <Text style={[sharedStyles.eyebrow, centeredTextStyle]}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={[sharedStyles.title, centeredTextStyle]}>
        {title}
      </Text>
      {subtitle ? <Text style={[sharedStyles.subtitle, centeredTextStyle]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = {
  centeredHeader: {
    alignItems: 'center' as const,
  },
  centeredHeaderText: {
    alignSelf: 'stretch' as const,
    textAlign: 'center' as const,
  },
};
