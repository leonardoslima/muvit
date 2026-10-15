import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { mobileRoutes } from '../../src/application/navigation/role-navigation';
import { AuthBrand } from '../../src/components/auth/auth-brand';
import { Screen } from '../../src/components/ui/screen';
import { Button, Field, Header, Message, Text } from '../../src/components/ui/v2';
import { authClient } from '../../src/lib/auth-client';
import { getAuthErrorMessage } from '../../src/lib/auth-errors';
import { spacing } from '../../src/lib/design-system/tokens';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(undefined);

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
        role: 'student',
      });
      if (result.error) {
        setError(getAuthErrorMessage(result.error, 'signup'));
        return;
      }

      router.replace(mobileRoutes.studentHome);
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError, 'signup'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      testID="signup-keyboard-avoiding-view"
    >
      <Screen
        scroll
        contentContainerStyle={{
          flexGrow: 1,
          gap: spacing.xxl,
          paddingBottom: spacing.xxl,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
        }}
      >
        <AuthBrand />
        <View
          testID="signup-heading"
          style={{ gap: spacing.sm, paddingHorizontal: spacing.optical }}
        >
          <Header
            title="Criar conta"
            titleClassName="text-[29px] leading-[40.6px] font-v2-extrabold"
          />
          <Text className="text-v2-secondary" variant="body">
            Comece como aluno independente.
          </Text>
        </View>

        <View testID="signup-fields" style={{ gap: spacing.xl }}>
          <Field
            label="Nome"
            onChangeText={setName}
            placeholder="Seu nome completo"
            size="auth"
            testID="signup-name"
            value={name}
          />
          <Field
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            size="auth"
            testID="signup-email"
            value={email}
          />
          <Field
            kind="password"
            label="Senha"
            onChangeText={setPassword}
            placeholder="Sua senha"
            size="auth"
            testID="signup-password"
            value={password}
          />
        </View>

        {error ? <Message description={error} variant="error" /> : null}

        <View testID="signup-actions" style={{ gap: spacing.md }}>
          <Button
            disabled={submitting}
            label={submitting ? 'Criando...' : 'Criar conta'}
            loading={submitting}
            onPress={submitting ? undefined : submit}
          />
          <Link href="/(auth)/login" asChild>
            <Button label="Já tenho conta" onPress={() => undefined} variant="secondary" />
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
