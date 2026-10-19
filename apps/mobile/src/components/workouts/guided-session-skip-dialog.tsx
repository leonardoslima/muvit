import { ConfirmationDialog, Text } from '../ui/v2';

type GuidedSessionSkipDialogProps = {
  visible: boolean;
  busy: boolean;
  exerciseName: string;
  completedSetCount: number;
  totalSetCount: number;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

export function GuidedSessionSkipDialog({
  visible,
  busy,
  exerciseName,
  completedSetCount,
  totalSetCount,
  onCancel,
  onConfirm,
}: GuidedSessionSkipDialogProps): React.JSX.Element {
  return (
    <ConfirmationDialog
      visible={visible}
      disabled={busy}
      loading={busy}
      title="Pular exercício?"
      description="As séries já realizadas serão mantidas. As restantes serão puladas nesta sessão."
      cancelLabel="Continuar neste exercício"
      confirmLabel="Pular exercício"
      confirmVariant="primary"
      onCancel={onCancel}
      onConfirm={() => void onConfirm()}
    >
      <Text>{exerciseName}</Text>
      <Text>
        {completedSetCount} de {totalSetCount} séries concluídas.
      </Text>
    </ConfirmationDialog>
  );
}
