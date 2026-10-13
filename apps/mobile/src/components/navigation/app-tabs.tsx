import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  controlSizes,
  fontFamilies,
  penTokens,
  spacing,
  typography,
} from '../../lib/design-system/tokens';

export type AppTab = {
  name: string;
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

export type AppTabsLayoutProps = {
  tabs: readonly AppTab[];
};

export function AppTabsLayout({ tabs }: AppTabsLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarActiveBackgroundColor: colors.subtle,
        tabBarInactiveTintColor: colors.inactiveIcon,
        tabBarItemStyle: {
          marginHorizontal: spacing.optical,
          borderRadius: penTokens['radius/29'],
          minHeight: controlSizes.touch,
        },
        tabBarButton: (props) => (
          <PlatformPressable
            {...props}
            style={[
              props.style,
              { borderRadius: penTokens['radius/29'], minHeight: controlSizes.touch },
            ]}
          />
        ),
        tabBarLabelStyle: {
          fontFamily: fontFamilies.semibold,
          fontSize: typography.caption.fontSize,
        },
        tabBarBackground: () => (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: controlSizes.tabBar,
              borderRadius: penTokens['radius/34'],
              backgroundColor: colors.surface,
            }}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: spacing.lg,
          transform: [{ translateY: -spacing.lg }],
          height: controlSizes.tabBar + insets.bottom,
          borderRadius: penTokens['radius/33'],
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: spacing.sm + insets.bottom,
          paddingTop: spacing.sm,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarLabel: tab.title,
            tabBarIcon: ({ color, size }) => <Ionicons color={color} name={tab.icon} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
