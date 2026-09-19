import { ProfileScreen } from '../../../src/screens/profile';

export default function TrainerProfileScreen() {
  return (
    <ProfileScreen
      accessDescription="Alunos e treinos"
      accountType="Treinador"
      fallbackInitials="TR"
      fallbackName="Treinador"
      subtitle="Sua conta e visão de treinador."
    />
  );
}
