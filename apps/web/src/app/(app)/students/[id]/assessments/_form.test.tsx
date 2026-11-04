import { fireEvent, render, screen } from '@testing-library/react';
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
  it('renderiza as seções e os campos definidos no layout da nova avaliação', () => {
    render(<AssessmentForm studentId="student-id" />);

    expect(screen.getByRole('heading', { name: 'Métricas principais' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Medidas de circunferência' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fotos de progresso' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Observações' })).toBeInTheDocument();
    expect(screen.getByLabelText('Data da avaliação')).toBeRequired();
    expect(screen.getByLabelText('Peso')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Altura')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Percentual de gordura')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Panturrilha direita')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Panturrilha esquerda')).toHaveAttribute('type', 'number');

    for (const label of ['Foto frontal', 'Foto posterior', 'Foto lateral']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('accept', 'image/jpeg,image/png');
    }

    expect(screen.getByRole('alert')).toHaveTextContent('Informe a data.');
    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute(
      'href',
      '/students/student-id',
    );
    expect(screen.getByRole('button', { name: 'Salvar avaliação' })).toBeEnabled();
  });

  it('mantém seções empilháveis e identifica a foto selecionada', () => {
    const { container } = render(<AssessmentForm studentId="student-id" />);
    const photo = new File(['front'], 'frente.jpg', { type: 'image/jpeg' });

    fireEvent.change(screen.getByLabelText('Foto frontal'), { target: { files: [photo] } });

    expect(screen.getByText('frente.jpg')).toBeInTheDocument();
    expect(container.querySelector('[data-responsive-layout="assessment-form"]')).toBeTruthy();
  });

  it('calcula o IMC a partir do peso e da altura', () => {
    render(<AssessmentForm studentId="student-id" />);

    fireEvent.change(screen.getByLabelText('Peso'), { target: { value: '72' } });
    fireEvent.change(screen.getByLabelText('Altura'), { target: { value: '180' } });

    expect(screen.getByText('22,2')).toBeInTheDocument();
  });
});
