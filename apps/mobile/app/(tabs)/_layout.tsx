import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontFamilies, radii, spacing } from '../../src/lib/styles';

type TabBarButtonProps = {
  children: ReactNode;
  style?: unknown;
  [key: string]: unknown;
};

function TabBarButton({ children, style, ...props }: TabBarButtonProps) {
  return (
    <Pressable
      {...(props as ComponentProps<typeof Pressable>)}
      style={style as StyleProp<ViewStyle>}
    >
      {children}
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarActiveBackgroundColor: colors.primarySoft,
        tabBarInactiveTintColor: colors.muted,
        tabBarItemStyle: {
          borderRadius: radii.pill,
        },
        tabBarButton: (props) => (
          <TabBarButton {...props} style={[props.style, { borderRadius: radii.pill }]} />
        ),
        tabBarLabelStyle: {
          fontFamily: fontFamilies.bodyStrong,
          fontSize: 12,
        },
        tabBarStyle: {
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          bottom: spacing.lg,
          height: 64,
          borderRadius: radii.pill,
          borderTopWidth: 0,
          backgroundColor: '#FFFFFFB3',
          paddingBottom: spacing.sm,
          paddingTop: spacing.sm,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoje',
          tabBarLabel: 'Hoje',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="calendar-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progresso',
          tabBarLabel: 'Progresso',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="stats-chart-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
