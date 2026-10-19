import { useRef, useState } from 'react';
import { authClient } from '../../lib/auth-client';
import { queryClient } from '../../lib/query-client';
import { Screen } from '../ui/screen';
import { ActionFeedback } from '../ui/v2/action-feedback';
import { StatePanel } from '../ui/v2/state-panel';

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
        action={{
          label: loggingOut ? 'Saindo...' : 'Sair e voltar ao login',
          onPress: () => void logoutUnsupportedSession(),
          disabled: loggingOut,
        }}
        description="Este perfil não pode acessar o aplicativo mobile."
        title="Perfil não reconhecido"
        kind="error"
      />
      {error ? <ActionFeedback description={error} variant="error" /> : null}
    </Screen>
  );
}
