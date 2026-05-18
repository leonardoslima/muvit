import { Tabs } from 'expo-router';
import { colors } from '../../src/lib/styles';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.ink,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarLabel: 'Hoje' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progresso', tabBarLabel: 'Progresso' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarLabel: 'Perfil' }} />
    </Tabs>
  );
}
