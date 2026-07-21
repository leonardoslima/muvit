import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { authClient } from '../../src/lib/auth-client';
import { getAuthErrorMessage } from '../../src/lib/auth-errors';
import { sharedStyles } from '../../src/lib/styles';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(undefined);

    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(getAuthErrorMessage(result.error, 'login'));
        return;
      }

      if (result.data.user.role !== 'student') {
        await authClient.signOut();
        setError('Este aplicativo é exclusivo para alunos.');
        return;
      }

      router.replace('/(tabs)');
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError, 'login'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[sharedStyles.screen, { justifyContent: 'center', gap: 18 }]}>
      <View style={{ gap: 6 }}>
        <Text style={sharedStyles.title}>Entrar</Text>
        <Text style={sharedStyles.subtitle}>Acesse seus treinos e registre sua evolução.</Text>
      </View>
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
        <Text style={sharedStyles.buttonText}>{submitting ? 'Entrando...' : 'Entrar'}</Text>
      </Pressable>
      <Link href="/(auth)/signup" asChild>
        <Pressable style={sharedStyles.secondaryButton}>
          <Text style={sharedStyles.secondaryButtonText}>Criar conta independente</Text>
        </Pressable>
      </Link>
    </View>
  );
}
