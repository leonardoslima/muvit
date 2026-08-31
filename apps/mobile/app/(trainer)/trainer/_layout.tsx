import { AppTabsLayout } from '../../../src/components/navigation/app-tabs';

export default function TrainerTabsLayout() {
  return (
    <AppTabsLayout
      tabs={[
        { icon: 'home-outline', name: 'index', title: 'Início' },
        { icon: 'people-outline', name: 'students', title: 'Alunos' },
        { icon: 'person-outline', name: 'profile', title: 'Perfil' },
      ]}
    />
  );
}
