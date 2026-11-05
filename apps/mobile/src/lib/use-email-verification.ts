import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { resolveInitialRoute } from '../application/navigation/role-navigation';
import { authClient } from './auth-client';
import { queryClient } from './query-client';

export function useEmailVerification() {
  const session = authClient.useSession();
  const { error: callbackError } = useLocalSearchParams<{ error?: string }>();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (callbackError) setError('Este link é inválido ou expirou. Solicite outro link.');
    void Promise.resolve()
      .then(() => authClient.$store.atoms.session.get().refetch())
      .catch(() => setError('Não foi possível consultar a sessão. Tente novamente.'));
  }, [callbackError]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function refresh() {
    setSubmitting(true);
    setError(undefined);
    try {
      const result = await authClient.getSession();
      if (result.error) throw new Error('session');
      if (!result.data?.user.emailVerified) {
        setError('Ainda não foi possível confirmar este email. Confira o link recebido.');
        return;
      }
      const destination = resolveInitialRoute(result.data.user.role);
      if (!destination) {
        setError('Não foi possível identificar o perfil desta conta.');
        return;
      }
      await authClient.$store.atoms.session.get().refetch();
      router.replace(destination);
    } catch {
      setError('Não foi possível consultar a sessão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }
  async function send() {
    if (submitting || cooldown > 0) return;
    const parsed = z.email().safeParse((session.data?.user.email ?? email).trim());
    if (!parsed.success) {
      setEmailError('Informe um email válido.');
      return;
    }
    setEmailError(undefined);
    setError(undefined);
    setSubmitting(true);
    setSent(false);
    try {
      const result = await authClient.sendVerificationEmail({
        email: parsed.data,
        callbackURL: 'muvit://verify-email',
      });
      if (result.error) throw new Error('send');
      setSent(true);
      setCooldown(60);
    } catch {
      setError('Não foi possível solicitar o link. Aguarde e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }
  async function signOut() {
    setSubmitting(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error('signOut');
      queryClient.clear();
      router.replace('/(auth)/login');
    } catch {
      setError('Não foi possível sair da conta. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }
  return {
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
  };
}
