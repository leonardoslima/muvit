'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { authClient } from './auth-client';

type VerificationUser = { email: string; role: string; emailVerified: boolean };

export function useEmailVerification() {
  const { replace, refresh: refreshRouter } = useRouter();
  const [user, setUser] = useState<VerificationUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string>();
  const initialized = useRef(false);

  const refresh = useCallback(
    async (navigate: boolean) => {
      setLoading(true);
      try {
        const response = await authClient.getSession();
        if (response.error) throw new Error('session');
        const current = response.data?.user ?? null;
        setUser(current);
        if (navigate && current?.emailVerified) {
          const destination =
            current.role === 'trainer' ? '/dashboard' : current.role === 'student' ? '/me' : null;
          if (destination) {
            replace(destination);
            refreshRouter();
          }
        }
      } catch {
        setError('Não foi possível consultar sua sessão. Tente novamente.');
      } finally {
        setLoading(false);
      }
    },
    [replace, refreshRouter],
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get('error');
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (callbackError) setError('Este link é inválido ou expirou. Solicite outro link.');
    if (!token) {
      void refresh(!callbackError);
      return;
    }
    window.history.replaceState(null, '', window.location.pathname);
    void (async () => {
      try {
        const result = await authClient.verifyEmail({ query: { token } });
        if (result.error) throw new Error('verification');
        await refresh(true);
      } catch {
        setError(
          'Não foi possível confirmar o email. Entre na conta correta e abra o link novamente.',
        );
        await refresh(false);
      }
    })();
  }, [refresh]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function send(email: string) {
    if (pending || cooldown > 0) return;
    setPending(true);
    setError(undefined);
    setSent(false);
    try {
      const result = await authClient.sendVerificationEmail({
        email: user?.email ?? email.trim(),
        callbackURL: `${window.location.origin}/verify-email`,
      });
      if (result.error) throw new Error('send');
      setSent(true);
      setCooldown(60);
    } catch {
      setError('Não foi possível solicitar o link. Aguarde e tente novamente.');
    } finally {
      setPending(false);
    }
  }
  async function signOut() {
    setPending(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error('signOut');
      replace('/login');
      refreshRouter();
    } catch {
      setError('Não foi possível sair da conta. Tente novamente.');
    } finally {
      setPending(false);
    }
  }
  return { user, loading, pending, sent, cooldown, error, send, refresh, signOut };
}
