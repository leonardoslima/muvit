import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import { Tabs } from 'expo-router';
import { colors, controlSizes, fontFamilies, radii, spacing } from '../../src/lib/styles';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarActiveBackgroundColor: colors.primarySoft,
        tabBarInactiveTintColor: colors.muted,
        tabBarItemStyle: {
          borderRadius: radii.pill,
        },
        tabBarButton: (props) => (
          <PlatformPressable {...props} style={[props.style, { borderRadius: radii.pill }]} />
        ),
        tabBarLabelStyle: {
          fontFamily: fontFamilies.bodyStrong,
          fontSize: 12,
        },
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: spacing.lg,
          transform: [{ translateY: -spacing.lg }],
          height: controlSizes.tabBar,
          borderRadius: radii.pill,
          borderTopWidth: 0,
          backgroundColor: colors.surfaceTranslucent,
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
