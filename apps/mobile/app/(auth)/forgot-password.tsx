import { useState } from 'react';
import { z } from 'zod';
import { AuthRecoveryLayout } from '../../src/components/auth/auth-recovery-layout';
import { ActionFeedback, Button, Field, Message } from '../../src/components/ui/v2';
import { authClient } from '../../src/lib/auth-client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (submitting) return;
    setError(undefined);
    setEmailError(undefined);
    const result = z.email().safeParse(email.trim());
    if (!result.success) {
      setEmailError('Informe um email válido.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await authClient.requestPasswordReset({
        email: result.data,
        redirectTo: 'muvit://reset-password',
      });
      if (response.error) {
        setError('Não foi possível enviar o link. Tente novamente.');
        return;
      }
      setSent(true);
    } catch {
      setError('Não foi possível enviar o link. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthRecoveryLayout
      title="Recuperar senha"
      description="Informe seu email para receber um link de redefinição."
    >
      {sent ? (
        <Message
          variant="success"
          description="Se existir uma conta com este email, você receberá um link para redefinir sua senha."
        />
      ) : (
        <>
          <Field
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="voce@exemplo.com"
            size="auth"
            testID="forgot-password-email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            disabled={submitting}
          />
          {error ? <ActionFeedback variant="error" description={error} /> : null}
          <Button
            label={submitting ? 'Enviando...' : 'Enviar link'}
            loading={submitting}
            disabled={submitting}
            onPress={submit}
          />
        </>
      )}
    </AuthRecoveryLayout>
  );
}
