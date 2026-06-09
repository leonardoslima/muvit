import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useAuth } from '../lib/auth-store';
import { colors, sharedStyles } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

type Me = {
  id: string;
  name: string;
  email: string | null;
  role: 'student' | 'trainer';
};

export function ProfileScreen() {
  const api = useApiClient();
  const clear = useAuth((state) => state.clear);
  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => api.request<Me>('/auth/me'),
  });

  async function logout() {
    await clear();
    router.replace('/(auth)/login');
  }

  if (query.isLoading) {
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
          {query.data?.name ?? 'Aluno'}
        </Text>
        <Text style={sharedStyles.subtitle}>{query.data?.email ?? 'Sem email cadastrado'}</Text>
      </View>
      <Pressable onPress={logout} style={sharedStyles.secondaryButton}>
        <Text style={sharedStyles.secondaryButtonText}>Sair</Text>
      </Pressable>
    </View>
  );
}
