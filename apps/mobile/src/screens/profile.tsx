import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AuthBrand } from '../components/auth/auth-brand';
import { Screen } from '../components/ui/screen';
import { Button, Card, Header, Message, StatePanel, Text } from '../components/ui/v2';
import { authClient } from '../lib/auth-client';
import { queryClient } from '../lib/query-client';

export type ProfileScreenProps = {
  accountType?: string;
  fallbackInitials?: string;
  fallbackName?: string;
};

export function ProfileScreen({
  accountType = 'Aluno independente',
  fallbackInitials = 'AL',
  fallbackName = 'Aluno',
}: ProfileScreenProps = {}) {
  const session = authClient.useSession();
  const user = session.data?.user;
  const [logoutError, setLogoutError] = useState<string>();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError(undefined);
    try {
      await authClient.signOut();
      router.replace('/(auth)/login');
    } catch {
      setLogoutError('Não foi possível sair agora.');
    } finally {
      queryClient.clear();
      setLoggingOut(false);
    }
  }

  if (session.isPending) {
    return (
      <Screen>
        <StatePanel
          description="Estamos carregando seus dados."
          kind="loading"
          testID="profile-loading"
          title="Carregando perfil"
        />
      </Screen>
    );
  }

  const displayName = user?.name?.trim() || fallbackName;
  const initials = getInitials(user?.name, fallbackInitials);

  return (
    <Screen scroll>
      <AuthBrand />
      <Header title="Perfil" />

      <Card className="items-center gap-3 rounded-[26px] border-0 p-6" testID="profile-card">
        <Text className="w-full text-center" variant="sectionTitle">
          Informações da sua conta.
        </Text>
        <View
          accessibilityLabel={`Iniciais de ${displayName}`}
          className="h-[72px] w-[72px] items-center justify-center rounded-[36px] bg-v2-subtle"
          testID="profile-avatar"
        >
          <Text className="text-v2-brand" variant="action">
            {initials}
          </Text>
        </View>
        <Text
          className="w-full text-center text-[25px] leading-[32.5px] font-v2-extrabold"
          testID="profile-name"
        >
          {displayName}
        </Text>
        <Text
          className="w-full text-center text-v2-secondary"
          testID="profile-email"
          variant="body"
        >
          {user?.email ?? 'Sem email cadastrado'}
        </Text>
        <Text
          className="w-full text-center text-v2-brand"
          testID="profile-account-type"
          variant="label"
        >
          {accountType}
        </Text>
      </Card>

      {logoutError ? (
        <Message description={logoutError} testID="profile-error" variant="error" />
      ) : null}
      <Button
        disabled={loggingOut}
        label={loggingOut ? 'Saindo...' : 'Sair'}
        loading={loggingOut}
        onPress={loggingOut ? undefined : () => void logout()}
        variant="secondary"
      />
    </Screen>
  );
}

function getInitials(name: string | undefined, fallbackInitials: string): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return initials || fallbackInitials;
}
