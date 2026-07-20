import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { authClient } from '../lib/auth-client';
import { queryClient } from '../lib/query-client';
import { colors, sharedStyles } from '../lib/styles';

export function ProfileScreen() {
  const session = authClient.useSession();
  const user = session.data?.user;

  async function logout() {
    try {
      await authClient.signOut();
    } finally {
      queryClient.clear();
      router.replace('/(auth)/login');
    }
  }

  if (session.isPending) {
    return (
      <View style={[sharedStyles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[sharedStyles.screen, { gap: 16 }]}>
      <Text style={sharedStyles.title}>Perfil</Text>
      <View style={sharedStyles.card}>
        <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '700' }}>
          {user?.name ?? 'Aluno'}
        </Text>
        <Text style={sharedStyles.subtitle}>{user?.email ?? 'Sem email cadastrado'}</Text>
        {user ? (
          <Text style={sharedStyles.subtitle}>
            Tipo de conta: {user.role === 'student' ? 'Aluno' : 'Treinador'}
          </Text>
        ) : null}
      </View>
      <Pressable onPress={logout} style={sharedStyles.secondaryButton}>
        <Text style={sharedStyles.secondaryButtonText}>Sair</Text>
      </Pressable>
    </View>
  );
}
