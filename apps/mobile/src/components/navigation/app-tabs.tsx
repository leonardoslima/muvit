import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  penTokens,
  v2Colors,
  v2ControlSizes,
  v2FontFamilies,
  v2Spacing,
  v2Typography,
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
        tabBarActiveTintColor: v2Colors.brand,
        tabBarActiveBackgroundColor: v2Colors.subtle,
        tabBarInactiveTintColor: v2Colors.inactiveIcon,
        tabBarItemStyle: {
          marginHorizontal: v2Spacing.optical,
          borderRadius: penTokens['radius/29'],
          minHeight: v2ControlSizes.touch,
        },
        tabBarButton: (props) => (
          <PlatformPressable
            {...props}
            style={[
              props.style,
              { borderRadius: penTokens['radius/29'], minHeight: v2ControlSizes.touch },
            ]}
          />
        ),
        tabBarLabelStyle: {
          fontFamily: v2FontFamilies.semibold,
          fontSize: v2Typography.caption.fontSize,
        },
        tabBarBackground: () => (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: v2ControlSizes.tabBar,
              borderRadius: penTokens['radius/34'],
              backgroundColor: v2Colors.surface,
            }}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: v2Spacing.lg,
          transform: [{ translateY: -v2Spacing.lg }],
          height: v2ControlSizes.tabBar + insets.bottom,
          borderRadius: penTokens['radius/33'],
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: v2Spacing.sm + insets.bottom,
          paddingTop: v2Spacing.sm,
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
