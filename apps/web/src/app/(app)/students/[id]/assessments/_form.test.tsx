import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssessmentForm } from './_form';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useActionState: () => [{ error: 'Informe a data.' }, vi.fn(), false],
  };
});

vi.mock('./actions', () => ({
  createAssessmentAction: vi.fn(),
}));

describe('AssessmentForm', () => {
  it('renders assessment fields and the action error', () => {
    render(<AssessmentForm studentId="student-id" />);

    expect(screen.getByLabelText('Data')).toBeRequired();
    expect(screen.getByLabelText('Peso (kg)')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Altura (cm)')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('% Gordura')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Foto')).toHaveAttribute('accept', 'image/jpeg,image/png');
    expect(screen.getByText('Informe a data.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar/i })).toBeEnabled();
  });
});
