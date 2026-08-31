import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { InlineMessage } from '../../src/components/ui/inline-message';
import { Screen } from '../../src/components/ui/screen';
import { authClient } from '../../src/lib/auth-client';
import { getAuthErrorMessage } from '../../src/lib/auth-errors';
import {
  colors,
  controlSizes,
  radii,
  sharedStyles,
  spacing,
  typography,
} from '../../src/lib/styles';

type LoginFieldProps = Omit<TextInputProps, 'onChangeText' | 'value'> & {
  iconName: ComponentProps<typeof Ionicons>['name'];
  iconTestID: string;
  label: string;
  onChangeText: (text: string) => void;
  value: string;
};

function LoginField({
  iconName,
  iconTestID,
  label,
  onChangeText,
  value,
  ...inputProps
}: LoginFieldProps) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[sharedStyles.label, typography.labelCompact]}>{label}</Text>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderRadius: radii.control,
          borderWidth: 1,
          flexDirection: 'row',
          gap: spacing.sm,
          height: controlSizes.authInput,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Ionicons color={colors.muted} name={iconName} size={18} testID={iconTestID} />
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          onChangeText={onChangeText}
          style={{
            color: colors.ink,
            flex: 1,
            ...typography.input,
            height: '100%',
          }}
          value={value}
        />
      </View>
    </View>
  );
}

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      testID="login-keyboard-avoiding-view"
    >
      <Screen
        scroll
        contentContainerStyle={{
          flexGrow: 1,
          gap: spacing.xxl,
          justifyContent: 'center',
          paddingBottom: spacing.xxl,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xxxl,
        }}
      >
        <View
          accessibilityLabel="Muvit"
          style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.md }}
        >
          <View
            testID="login-brand-symbol"
            style={{
              alignItems: 'center',
              backgroundColor: colors.primary,
              borderRadius: radii.control,
              height: controlSizes.brandMark,
              justifyContent: 'center',
              width: controlSizes.brandMark,
            }}
          >
            <Ionicons color={colors.ink} name="barbell-outline" size={22} />
          </View>
          <View style={{ gap: spacing.xs }}>
            <Text
              style={{
                color: colors.ink,
                ...typography.brandCompact,
              }}
            >
              Muvit
            </Text>
            <Text
              style={{
                color: colors.primaryText,
                ...typography.brandTagline,
                letterSpacing: 0.7,
              }}
            >
              SEU TREINO, NO SEU RITMO
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" style={sharedStyles.title}>
            Entrar
          </Text>
          <Text style={sharedStyles.subtitle}>Acesse seus treinos e registre sua evolução.</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <LoginField
            autoCapitalize="none"
            autoComplete="email"
            iconName="mail-outline"
            iconTestID="login-email-icon"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            value={email}
          />
          <LoginField
            iconName="lock-closed-outline"
            iconTestID="login-password-icon"
            label="Senha"
            onChangeText={setPassword}
            placeholder="Sua senha"
            secureTextEntry
            value={password}
          />
        </View>

        {error ? <InlineMessage message={error} tone="error" /> : null}

        <View style={{ gap: spacing.sm }}>
          <Pressable
            accessible
            accessibilityLabel={submitting ? 'Entrando...' : 'Entrar'}
            accessibilityRole="button"
            disabled={submitting}
            onPress={submitting ? undefined : submit}
            style={({ pressed }) => [
              sharedStyles.button,
              { borderRadius: radii.control, flexDirection: 'row', gap: spacing.sm },
              submitting ? { opacity: 0.5 } : null,
              pressed && !submitting ? { opacity: 0.8 } : null,
            ]}
          >
            <Text style={[sharedStyles.buttonText, typography.bodyStrong]}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </Text>
            <Ionicons
              color={colors.ink}
              name="log-in-outline"
              size={18}
              testID="login-submit-icon"
            />
          </Pressable>
          <Link href="/(auth)/signup" asChild>
            <Pressable
              accessible
              accessibilityLabel="Criar conta independente"
              accessibilityRole="button"
              onPress={() => undefined}
              style={({ pressed }) => [
                sharedStyles.secondaryButton,
                { borderRadius: radii.control },
                pressed ? { opacity: 0.8 } : null,
              ]}
            >
              <Text style={[sharedStyles.secondaryButtonText, typography.bodyStrong]}>
                Criar conta independente
              </Text>
            </Pressable>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
