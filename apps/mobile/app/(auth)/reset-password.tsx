import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AuthRecoveryLayout } from '../../src/components/auth/auth-recovery-layout';
import { ActionFeedback, Button, Field, Message } from '../../src/components/ui/v2';
import { authClient } from '../../src/lib/auth-client';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[]; error?: string | string[] }>();
  const token = typeof params.token === 'string' ? params.token : undefined;
  const invalidCallback = !token || Boolean(params.error);
  return (
    <ResetPasswordForm
      key={`${token ?? ''}:${invalidCallback}`}
      token={token}
      invalidCallback={invalidCallback}
    />
  );
}

function ResetPasswordForm({
  token,
  invalidCallback,
}: { token: string | undefined; invalidCallback: boolean }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmationError, setConfirmationError] = useState<string>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rejectedToken, setRejectedToken] = useState(false);
  const invalidLink = invalidCallback || rejectedToken;

  async function submit() {
    if (submitting || invalidLink || !token) return;
    setError(undefined);
    setPasswordError(undefined);
    setConfirmationError(undefined);
    if (password.length < 8 || password.length > 128) {
      setPasswordError('Use entre 8 e 128 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setConfirmationError('As senhas devem ser iguais.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        if (result.error.code === 'INVALID_TOKEN') {
          setRejectedToken(true);
          return;
        }
        setError('Não foi possível atualizar a senha. Tente novamente.');
        return;
      }
      await authClient.signOut().catch(() => undefined);
      setPassword('');
      setConfirmation('');
      setCompleted(true);
      authClient.$store.notify('$sessionSignal');
    } catch {
      setError('Não foi possível atualizar a senha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthRecoveryLayout
      title="Redefinir senha"
      description="Escolha uma nova senha para sua conta."
    >
      {completed ? (
        <Message variant="success" description="Senha atualizada. Entre com sua nova senha." />
      ) : invalidLink ? (
        <>
          <Message
            variant="warning"
            description="Este link é inválido ou expirou. Solicite um novo link."
          />
          <Link href="/(auth)/forgot-password" asChild>
            <Button label="Solicitar novo link" onPress={() => undefined} />
          </Link>
        </>
      ) : (
        <>
          <Field
            kind="password"
            autoComplete="new-password"
            label="Nova senha"
            hint="Use entre 8 e 128 caracteres."
            size="auth"
            testID="reset-password-new"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            disabled={submitting}
          />
          <Field
            kind="password"
            autoComplete="new-password"
            label="Confirmar senha"
            size="auth"
            testID="reset-password-confirmation"
            value={confirmation}
            onChangeText={setConfirmation}
            error={confirmationError}
            disabled={submitting}
          />
          {error ? <ActionFeedback variant="error" description={error} /> : null}
          <Button
            label={submitting ? 'Salvando...' : 'Salvar nova senha'}
            disabled={submitting}
            loading={submitting}
            onPress={submit}
          />
        </>
      )}
    </AuthRecoveryLayout>
  );
}
