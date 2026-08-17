import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Brand } from '../../src/components/ui/brand';
import { AppButton } from '../../src/components/ui/button';
import { Field } from '../../src/components/ui/field';
import { Screen, ScreenHeader } from '../../src/components/ui/screen';
import { authClient } from '../../src/lib/auth-client';
import { getAuthErrorMessage } from '../../src/lib/auth-errors';
import { colors, sharedStyles, spacing } from '../../src/lib/styles';

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
    <Screen
      scroll
      contentContainerStyle={{
        flexGrow: 1,
        gap: spacing.xl,
        justifyContent: 'center',
        padding: spacing.xxl,
      }}
    >
      <Brand />
      <ScreenHeader subtitle="Acesse seus treinos e registre sua evolução." title="Entrar" />
      <View style={{ gap: spacing.md }}>
        <Field
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="voce@exemplo.com"
          value={email}
        />
        <Field
          label="Senha"
          onChangeText={setPassword}
          placeholder="Sua senha"
          secureTextEntry
          value={password}
        />
      </View>
      {error ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            backgroundColor: `${colors.danger}18`,
            borderRadius: 10,
            padding: spacing.md,
          }}
        >
          <Text style={sharedStyles.error}>{error}</Text>
        </View>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <AppButton
          disabled={submitting}
          label={submitting ? 'Entrando...' : 'Entrar'}
          onPress={submit}
        />
        <Link href="/(auth)/signup" asChild>
          <AppButton
            label="Criar conta independente"
            onPress={() => undefined}
            variant="secondary"
          />
        </Link>
      </View>
    </Screen>
  );
}
