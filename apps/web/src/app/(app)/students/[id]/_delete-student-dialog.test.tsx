import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeleteStudentDialog } from './_delete-student-dialog';

describe('DeleteStudentDialog', () => {
  it('fecha a confirmação sem excluir ao cancelar', async () => {
    const deleteAction = vi.fn();
    render(
      <DeleteStudentDialog
        studentId="student-1"
        studentName="Ana Lima"
        deleteAction={deleteAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir aluno' }));
    expect(screen.getByRole('dialog', { name: 'Excluir aluno?' })).toBeInTheDocument();
    expect(screen.getByText(/Ana Lima/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Excluir aluno?' })).not.toBeInTheDocument();
    });
    expect(deleteAction).not.toHaveBeenCalled();
  });

  it('envia o identificador do aluno somente após a confirmação', async () => {
    const deleteAction = vi.fn();
    render(
      <DeleteStudentDialog
        studentId="student-1"
        studentName="Ana Lima"
        deleteAction={deleteAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir aluno' }));
    const dialog = screen.getByRole('dialog', { name: 'Excluir aluno?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir aluno' }));

    await waitFor(() => expect(deleteAction).toHaveBeenCalledOnce());
    const formData = deleteAction.mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('id')).toBe('student-1');
  });
});
