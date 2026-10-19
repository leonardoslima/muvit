import { ActionFeedback, Button, Dialog, Text } from '../ui/v2';

export type GuidedSessionExitDialogProps = {
  visible: boolean;
  busy: boolean;
  context: string;
  storageError: string | null;
  onContinue: () => void;
  onSave: () => Promise<void>;
  onDiscard: () => Promise<void>;
};

export function GuidedSessionExitDialog({
  visible,
  busy,
  context,
  storageError,
  onContinue,
  onSave,
  onDiscard,
}: GuidedSessionExitDialogProps): React.JSX.Element {
  return (
    <Dialog
      visible={visible}
      disabled={busy}
      onClose={onContinue}
      title="Sair da sessão"
      description="Escolha como deseja sair."
    >
      <Text>{context}</Text>
      {storageError ? (
        <ActionFeedback
          title="Não foi possível salvar seu progresso"
          description={storageError}
          variant="error"
        />
      ) : null}
      <Button
        disabled={busy}
        label="Continuar treinando"
        onPress={onContinue}
        variant="secondary"
      />
      <Button disabled={busy} label="Salvar e sair" onPress={() => void onSave()} />
      <Button
        disabled={busy}
        label="Descartar treino"
        onPress={() => void onDiscard()}
        variant="destructive"
      />
      <Text className="text-v2-secondary" variant="support">
        Você poderá retomar depois se escolher salvar e sair.
      </Text>
    </Dialog>
  );
}
