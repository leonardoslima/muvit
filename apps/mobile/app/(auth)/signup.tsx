import type { AuthResponse } from '@muvit/validators';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ApiClient } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth-store';
import { config } from '../../src/lib/config';
import { sharedStyles } from '../../src/lib/styles';

export default function SignupScreen() {
  const setTokens = useAuth((state) => state.setTokens);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(undefined);
    try {
      const client = new ApiClient({
        baseUrl: config.apiUrl,
        getAccessToken: () => undefined,
        getRefreshToken: () => undefined,
        setAccessToken: async () => undefined,
        clearAuth: async () => undefined,
      });
      const response = await client.request<AuthResponse>('/auth/signup/student', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      await setTokens(response.accessToken, response.refreshToken, response.user.id);
      router.replace('/(tabs)');
    } catch {
      setError('Nao foi possivel criar sua conta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[sharedStyles.screen, { justifyContent: 'center', gap: 18 }]}>
      <View style={{ gap: 6 }}>
        <Text style={sharedStyles.title}>Criar conta</Text>
        <Text style={sharedStyles.subtitle}>Comece como aluno independente.</Text>
      </View>
      <TextInput
        onChangeText={setName}
        placeholder="Nome"
        style={sharedStyles.input}
        value={name}
      />
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        style={sharedStyles.input}
        value={email}
      />
      <TextInput
        onChangeText={setPassword}
        placeholder="Senha"
        secureTextEntry
        style={sharedStyles.input}
        value={password}
      />
      {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
      <Pressable disabled={submitting} onPress={submit} style={sharedStyles.button}>
        <Text style={sharedStyles.buttonText}>{submitting ? 'Criando...' : 'Criar conta'}</Text>
      </Pressable>
      <Link href="/(auth)/login" asChild>
        <Pressable style={sharedStyles.secondaryButton}>
          <Text style={sharedStyles.secondaryButtonText}>Ja tenho conta</Text>
        </Pressable>
      </Link>
    </View>
  );
}
