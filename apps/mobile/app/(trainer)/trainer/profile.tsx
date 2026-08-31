import { ProfileScreen } from '../../../src/screens/profile';

export default function TrainerProfileScreen() {
  return (
    <ProfileScreen
      accountType="Treinador"
      fallbackInitials="TR"
      fallbackName="Treinador"
      journeyDescription="Acompanhe seus alunos no Muvit."
    />
  );
}
