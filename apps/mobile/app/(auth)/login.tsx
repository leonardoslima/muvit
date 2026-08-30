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
import { Screen } from '../../src/components/ui/screen';
import { authClient } from '../../src/lib/auth-client';
import { getAuthErrorMessage } from '../../src/lib/auth-errors';
import { colors, fontFamilies, sharedStyles, spacing } from '../../src/lib/styles';

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
    <View style={{ gap: 7 }}>
      <Text
        style={{
          color: colors.ink,
          fontFamily: fontFamilies.bodyStrong,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderRadius: 8,
          borderWidth: 1,
          flexDirection: 'row',
          gap: 10,
          height: 50,
          paddingHorizontal: 14,
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
            fontFamily: fontFamilies.body,
            fontSize: 14,
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
          style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}
        >
          <View
            testID="login-brand-symbol"
            style={{
              alignItems: 'center',
              backgroundColor: colors.primary,
              borderRadius: 8,
              height: 42,
              justifyContent: 'center',
              width: 42,
            }}
          >
            <Ionicons color={colors.ink} name="barbell-outline" size={22} />
          </View>
          <View style={{ gap: 1 }}>
            <Text
              style={{
                color: colors.ink,
                fontFamily: fontFamilies.heading,
                fontSize: 24,
              }}
            >
              Muvit
            </Text>
            <Text
              style={{
                color: colors.primary,
                fontFamily: fontFamilies.bodyStrong,
                fontSize: 9,
                letterSpacing: 0.7,
              }}
            >
              SEU TREINO, NO SEU RITMO
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{ color: colors.ink, fontFamily: fontFamilies.heading, fontSize: 28 }}
          >
            Entrar
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: fontFamilies.body,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            Acesse seus treinos e registre sua evolução.
          </Text>
        </View>

        <View style={{ gap: 14 }}>
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

        <View style={{ gap: 10 }}>
          <Pressable
            accessible
            accessibilityLabel={submitting ? 'Entrando...' : 'Entrar'}
            accessibilityRole="button"
            disabled={submitting}
            onPress={submitting ? undefined : submit}
            style={({ pressed }) => [
              {
                alignItems: 'center',
                backgroundColor: colors.primary,
                borderRadius: 8,
                flexDirection: 'row',
                gap: spacing.sm,
                height: 48,
                justifyContent: 'center',
              },
              submitting ? { opacity: 0.5 } : null,
              pressed && !submitting ? { opacity: 0.8 } : null,
            ]}
          >
            <Text style={{ color: colors.ink, fontFamily: fontFamilies.bodyStrong, fontSize: 14 }}>
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
                {
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: 8,
                  borderWidth: 1,
                  height: 48,
                  justifyContent: 'center',
                },
                pressed ? { opacity: 0.8 } : null,
              ]}
            >
              <Text
                style={{ color: colors.ink, fontFamily: fontFamilies.bodyStrong, fontSize: 14 }}
              >
                Criar conta independente
              </Text>
            </Pressable>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
