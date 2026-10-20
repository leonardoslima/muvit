import type { ReactNode } from 'react';
import { Button } from './button';
import type { ControlVariant } from './control';
import { Dialog } from './dialog';

export type ConfirmationDialogProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: ControlVariant;
  loading?: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: ReactNode;
};

export function ConfirmationDialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  confirmVariant = 'destructive',
  loading = false,
  disabled = false,
  onCancel,
  onConfirm,
  children,
}: ConfirmationDialogProps): React.JSX.Element {
  const blocked = disabled || loading;
  return (
    <Dialog
      visible={visible}
      title={title}
      description={description}
      disabled={blocked}
      onClose={onCancel}
    >
      {children}
      <Button disabled={blocked} label={cancelLabel} onPress={onCancel} variant="secondary" />
      <Button
        disabled={blocked}
        loading={loading}
        label={confirmLabel}
        onPress={onConfirm}
        variant={confirmVariant}
      />
    </Dialog>
  );
}
