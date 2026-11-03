'use client';

import { useState } from 'react';
import { authClient } from './auth-client';

export function usePasswordRecovery() {
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>();
  const [invalidToken, setInvalidToken] = useState(false);

  async function requestReset(formData: FormData): Promise<void> {
    if (pending) return;
    const email = String(formData.get('email') ?? '').trim();
    if (!email) {
      setError('Informe seu e-mail.');
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) {
        setError('Não foi possível enviar o link. Tente novamente.');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Não foi possível enviar o link. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  async function resetPassword(formData: FormData, token: string): Promise<void> {
    if (pending || !token || invalidToken) return;
    const newPassword = String(formData.get('password') ?? '');
    const confirmation = String(formData.get('confirmation') ?? '');
    setError(undefined);
    if (newPassword.length < 8) {
      setError('Senha precisa de pelo menos 8 caracteres.');
      return;
    }
    if (newPassword.length > 128) {
      setError('Senha precisa ter no máximo 128 caracteres.');
      return;
    }
    if (newPassword !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }
    setPending(true);
    try {
      const result = await authClient.resetPassword({ newPassword, token });
      if (result.error) {
        if (result.error.code === 'INVALID_TOKEN') {
          setInvalidToken(true);
          return;
        }
        setError('Não foi possível redefinir a senha. Tente novamente.');
        return;
      }
      // A senha já foi alterada; falha ao limpar a sessão não desfaz a redefinição.
      await authClient.signOut().catch(() => undefined);
      setSuccess(true);
    } catch {
      setError('Não foi possível redefinir a senha. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return { pending, success, error, invalidToken, requestReset, resetPassword };
}
