import { AuthRecoveryLayout } from '../../src/components/auth/auth-recovery-layout';
import { ActionFeedback, Button, Field, Message } from '../../src/components/ui/v2';
import { useEmailVerification } from '../../src/lib/use-email-verification';

export default function VerifyEmailScreen() {
  const {
    session,
    email,
    setEmail,
    emailError,
    error,
    submitting,
    sent,
    cooldown,
    send,
    refresh,
    signOut,
  } = useEmailVerification();
  return (
    <AuthRecoveryLayout
      title="Confirme seu email"
      description="Confirme seu endereço para acessar seus dados no Muvit."
    >
      {session.data ? (
        <Message description={`Conta: ${session.data.user.email}`} />
      ) : (
        <Field
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="voce@exemplo.com"
          size="auth"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          disabled={submitting}
        />
      )}
      {sent ? (
        <Message
          variant="success"
          description="Se houver uma conta pendente com esse email, um link de confirmação será enviado."
        />
      ) : null}
      {error ? <ActionFeedback variant="error" description={error} /> : null}
      <Button
        label={submitting ? 'Aguarde...' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Enviar link'}
        loading={submitting}
        disabled={submitting || cooldown > 0}
        onPress={send}
      />
      {session.data ? (
        <>
          <Button
            label="Já confirmei"
            variant="secondary"
            disabled={submitting}
            onPress={refresh}
          />
          <Button label="Sair da conta" variant="text" disabled={submitting} onPress={signOut} />
        </>
      ) : null}
    </AuthRecoveryLayout>
  );
}
