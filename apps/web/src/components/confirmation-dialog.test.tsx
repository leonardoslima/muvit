import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from './confirmation-dialog';
import { Button } from './ui/button';

function renderConfirmation(confirmAction: (formData: FormData) => void | Promise<void>) {
  render(
    <ConfirmationDialog
      trigger={<Button aria-label="Excluir item">Excluir</Button>}
      title="Excluir item?"
      description="Esta ação não pode ser desfeita."
      confirmLabel="Excluir item"
      pendingLabel="Excluindo..."
      confirmAction={confirmAction}
      hiddenFields={{ id: 'item-1' }}
    />,
  );
}

describe('ConfirmationDialog', () => {
  it('fecha sem executar a ação ao cancelar', async () => {
    const confirmAction = vi.fn();
    renderConfirmation(confirmAction);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir item' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Excluir item?' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Excluir item?' })).toHaveClass(
      'font-display',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog', { name: 'Excluir item?' })).not.toBeInTheDocument();
    });
    expect(confirmAction).not.toHaveBeenCalled();
  });

  it('envia os campos, bloqueia nova confirmação e fecha após sucesso', async () => {
    let resolveAction: (() => void) | undefined;
    const confirmAction = vi.fn(
      (_formData: FormData) =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );
    renderConfirmation(confirmAction);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir item' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Excluir item?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir item' }));

    await waitFor(() => expect(confirmAction).toHaveBeenCalledOnce());
    const formData = confirmAction.mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData?.get('id')).toBe('item-1');
    expect(within(dialog).getByRole('button', { name: 'Excluindo...' })).toBeDisabled();

    await act(async () => resolveAction?.());

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog', { name: 'Excluir item?' })).not.toBeInTheDocument();
    });
  });
});
