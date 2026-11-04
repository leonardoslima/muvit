import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from './confirmation-dialog';

describe('ConfirmationDialog', () => {
  it('cancela pelo Back do sistema sem confirmar a ação', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        visible
        title="Remover dia?"
        description="Remover Treino A."
        confirmLabel="Remover dia"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('bloqueia confirmação e dispensa quando desabilitado', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        visible
        disabled
        title="Remover dia?"
        description="Remover Treino A."
        confirmLabel="Remover dia"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Remover dia' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('não exibe conteúdo quando fechado', () => {
    render(
      <ConfirmationDialog
        visible={false}
        title="Remover dia?"
        description="Remover Treino A."
        confirmLabel="Remover dia"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByText('Remover dia?')).toBeNull();
  });
});
