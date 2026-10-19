import { Link, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { resolveInitialRoute } from '../../src/application/navigation/role-navigation';
import { AuthBrand } from '../../src/components/auth/auth-brand';
import { Screen } from '../../src/components/ui/screen';
import { ActionFeedback, Button, Field, Header, Text } from '../../src/components/ui/v2';
import { authClient } from '../../src/lib/auth-client';
import { getAuthErrorMessage } from '../../src/lib/auth-errors';
import { spacing } from '../../src/lib/design-system/tokens';

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

      const destination = resolveInitialRoute(result.data.user.role);
      if (!destination) {
        await authClient.signOut();
        setError('Não foi possível identificar o perfil desta conta.');
        return;
      }

      router.replace(destination);
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
        gap: spacing.xxl,
        paddingBottom: spacing.xxl,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl + spacing.md,
      }}
    >
      <AuthBrand />
      <View testID="login-heading" style={{ gap: spacing.sm, paddingHorizontal: spacing.optical }}>
        <Header title="Entrar" titleClassName="text-[29px] leading-[40.6px] font-v2-extrabold" />
        <Text className="text-v2-secondary" variant="body">
          Acesse sua conta para continuar.
        </Text>
      </View>

      <View testID="login-fields" style={{ gap: spacing.xl }}>
        <Field
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label="Email"
          style={{ padding: 0 }}
          onChangeText={setEmail}
          placeholder="voce@exemplo.com"
          size="auth"
          testID="login-email"
          value={email}
        />
        <Field
          kind="password"
          label="Senha"
          style={{ padding: 0 }}
          onChangeText={setPassword}
          placeholder="Sua senha"
          size="auth"
          testID="login-password"
          value={password}
        />
      </View>

      {error ? <ActionFeedback description={error} variant="error" /> : null}

      <View testID="login-actions" style={{ gap: spacing.md }}>
        <Button
          disabled={submitting}
          label={submitting ? 'Entrando...' : 'Entrar'}
          loading={submitting}
          onPress={submitting ? undefined : submit}
        />
        <Link href="/(auth)/signup" asChild>
          <Button label="Criar conta independente" onPress={() => undefined} variant="secondary" />
        </Link>
      </View>
    </Screen>
  );
}
