import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteStudentAction } from './actions';
import StudentDetailPage from './page';

vi.mock('@/components/student-form', () => ({ StudentForm: () => <div>Formulário</div> }));
vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({
  getStudentsById: vi.fn().mockResolvedValue({
    data: {
      id: 'student-1',
      name: 'Ana Lima',
      email: 'ana@example.com',
      phone: null,
      birthDate: null,
      gender: null,
      goals: null,
      restrictions: null,
      status: 'active',
      isIndependent: false,
      createdAt: '2026-06-20T00:00:00.000Z',
    },
  }),
}));
vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('./actions', () => ({ deleteStudentAction: vi.fn(), updateStudentAction: vi.fn() }));

describe('StudentDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('confirma a exclusão com o identificador do aluno', async () => {
    vi.mocked(deleteStudentAction).mockResolvedValue(undefined);
    render(await StudentDetailPage({ params: Promise.resolve({ id: 'student-1' }) }));

    fireEvent.click(screen.getByRole('button', { name: 'Excluir aluno' }));
    const dialog = screen.getByRole('dialog', { name: 'Excluir aluno?' });
    expect(within(dialog).getByText(/Ana Lima/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir aluno' }));

    await waitFor(() => expect(deleteStudentAction).toHaveBeenCalledOnce());
    const formData = vi.mocked(deleteStudentAction).mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData?.get('id')).toBe('student-1');
  });
});
