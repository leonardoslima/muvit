import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import { Tabs, useSegments } from 'expo-router';
import type { ComponentProps } from 'react';
import { colors, controlSizes, fontFamilies, radii, spacing, typography } from '../../lib/styles';

export type AppTab = {
  name: string;
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

export type AppTabsLayoutProps = {
  hideTabBarOnNestedRoute?: string;
  tabs: readonly AppTab[];
};

export function AppTabsLayout({ hideTabBarOnNestedRoute, tabs }: AppTabsLayoutProps) {
  const segments = useSegments();
  const nestedRouteSegmentIndex = hideTabBarOnNestedRoute
    ? segments.lastIndexOf(hideTabBarOnNestedRoute)
    : -1;
  const hideTabBar = nestedRouteSegmentIndex >= 0 && nestedRouteSegmentIndex < segments.length - 1;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarActiveBackgroundColor: colors.primarySoft,
        tabBarInactiveTintColor: colors.muted,
        tabBarItemStyle: {
          borderRadius: radii.pill,
          flex: 1,
        },
        tabBarButton: (props) => (
          <PlatformPressable {...props} style={[props.style, { borderRadius: radii.pill }]} />
        ),
        tabBarLabelStyle: {
          fontFamily: fontFamilies.bodyStrong,
          fontSize: typography.caption.fontSize,
        },
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: spacing.lg,
          transform: [{ translateY: -spacing.lg }],
          height: controlSizes.tabBar,
          borderRadius: radii.pill,
          borderTopWidth: 0,
          backgroundColor: colors.surface,
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.sm,
          paddingTop: spacing.sm,
          gap: spacing.sm,
          ...(hideTabBar ? { display: 'none' as const } : {}),
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
