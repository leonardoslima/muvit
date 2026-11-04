import { ActionFeedback, Button, Dialog } from '../ui/v2';

export type WorkoutEditorExitDialogProps = {
  visible: boolean;
  busy: boolean;
  error?: string;
  onContinue: () => void;
  onSave: () => void;
  onDiscard: () => void;
};

export function WorkoutEditorExitDialog({
  visible,
  busy,
  error,
  onContinue,
  onSave,
  onDiscard,
}: WorkoutEditorExitDialogProps): React.JSX.Element {
  return (
    <Dialog
      visible={visible}
      disabled={busy}
      onClose={onContinue}
      title="Sair sem salvar?"
      description="Você tem alterações não salvas. Salve um rascunho na sua conta para continuar depois."
    >
      {error ? (
        <ActionFeedback
          title="Não foi possível salvar o rascunho"
          description={error}
          variant="error"
        />
      ) : null}
      <Button disabled={busy} label="Continuar editando" onPress={onContinue} variant="secondary" />
      <Button
        disabled={busy}
        loading={busy}
        label={
          busy ? 'Salvando rascunho...' : error ? 'Tentar salvar e sair' : 'Salvar rascunho e sair'
        }
        onPress={onSave}
      />
      <Button disabled={busy} label="Descartar e sair" onPress={onDiscard} variant="destructive" />
    </Dialog>
  );
}
