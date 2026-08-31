import { AppTabsLayout } from '../../../src/components/navigation/app-tabs';

export default function TabsLayout() {
  return (
    <AppTabsLayout
      tabs={[
        { icon: 'calendar-outline', name: 'index', title: 'Hoje' },
        { icon: 'stats-chart-outline', name: 'progress', title: 'Progresso' },
        { icon: 'person-outline', name: 'profile', title: 'Perfil' },
      ]}
    />
  );
}
