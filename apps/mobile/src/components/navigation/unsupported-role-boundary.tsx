import { useRef, useState } from 'react';
import { authClient } from '../../lib/auth-client';
import { queryClient } from '../../lib/query-client';
import { InlineMessage } from '../ui/inline-message';
import { Screen } from '../ui/screen';
import { StatePanel } from '../ui/state-panel';

export function UnsupportedRoleBoundary() {
  const [error, setError] = useState<string>();
  const [loggingOut, setLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);

  async function logoutUnsupportedSession(): Promise<void> {
    if (isLoggingOutRef.current) return;

    isLoggingOutRef.current = true;
    setLoggingOut(true);
    setError(undefined);

    try {
      await authClient.signOut();
    } catch {
      setError('Não foi possível encerrar esta sessão. Tente novamente.');
    } finally {
      queryClient.clear();
      isLoggingOutRef.current = false;
      setLoggingOut(false);
    }
  }

  return (
    <Screen>
      <StatePanel
        actionLabel={loggingOut ? 'Saindo...' : 'Sair e voltar ao login'}
        description="Este perfil não pode acessar o aplicativo mobile."
        onAction={() => void logoutUnsupportedSession()}
        title="Perfil não reconhecido"
        tone="error"
      />
      {error ? <InlineMessage message={error} tone="error" /> : null}
    </Screen>
  );
}
