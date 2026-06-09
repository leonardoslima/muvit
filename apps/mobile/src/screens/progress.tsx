import type { assessmentSchema } from '@muvit/validators';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import type { z } from 'zod';
import { useAuth } from '../lib/auth-store';
import { colors, sharedStyles } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

type Assessment = z.infer<typeof assessmentSchema>;

export function ProgressScreen() {
  const api = useApiClient();
  const userId = useAuth((state) => state.userId);
  const query = useQuery({
    enabled: Boolean(userId),
    queryKey: ['assessments', userId],
    queryFn: async () => {
      if (!userId) throw new Error('usuario nao autenticado');
      return api.request<{ items: Assessment[]; total: number }>(
        `/students/${userId}/assessments?limit=20`,
      );
    },
  });

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }} style={sharedStyles.screen}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={sharedStyles.title}>Progresso</Text>
        <Link href="/new-assessment" asChild>
          <Pressable style={[sharedStyles.button, { minHeight: 40 }]}>
            <Text style={sharedStyles.buttonText}>+</Text>
          </Pressable>
        </Link>
      </View>

      {query.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {query.data?.items.length === 0 ? (
        <Text style={sharedStyles.subtitle}>Nenhuma avaliacao registrada.</Text>
      ) : null}

      {query.data?.items.map((assessment: Assessment) => (
        <View key={assessment.id} style={sharedStyles.card}>
          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '700' }}>
            {assessment.date}
          </Text>
          <Text style={sharedStyles.subtitle}>Peso: {assessment.weightKg ?? '-'} kg</Text>
          <Text style={sharedStyles.subtitle}>Gordura: {assessment.bodyFatPct ?? '-'}%</Text>
          {assessment.notes ? <Text style={sharedStyles.subtitle}>{assessment.notes}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}
