import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentForm } from './student-form';

describe('StudentForm', () => {
  it('renders initial values and the custom submit label', () => {
    render(
      <StudentForm
        action={vi.fn()}
        submitLabel="Atualizar aluno"
        initial={{
          id: 'student-id',
          name: 'Ana Souza',
          email: 'ana@example.com',
          phone: '11999999999',
          birthDate: '2000-01-01',
          gender: 'female',
          goals: 'Hipertrofia',
          trainingDays: 4,
          restrictions: 'Joelho',
          internalNotes: 'Prefere horários matinais.',
          status: 'paused',
        }}
      />,
    );

    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Souza');
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@example.com');
    expect(screen.getByLabelText('Telefone')).toHaveValue('11999999999');
    expect(screen.getByLabelText('Data de nascimento')).toHaveValue('2000-01-01');
    expect(screen.getByLabelText('Sexo')).toHaveValue('female');
    expect(screen.getByLabelText('Status')).toHaveValue('paused');
    expect(screen.getByLabelText('Objetivos')).toHaveValue('Hipertrofia');
    expect(screen.getByLabelText('Dias de treino por semana')).toHaveValue(4);
    expect(screen.getByLabelText(/Restri/i)).toHaveValue('Joelho');
    expect(screen.getByLabelText('Notas internas')).toHaveValue('Prefere horários matinais.');
    expect(screen.getByRole('button', { name: 'Atualizar aluno' })).toBeEnabled();
  });

  it('renders the empty create form with required name', () => {
    render(<StudentForm action={vi.fn()} />);

    expect(screen.getByLabelText('Nome')).toBeRequired();
    expect(screen.getByLabelText('Status')).toHaveValue('active');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });

  it('associates server validation messages with their fields', async () => {
    const action = vi.fn(async () => ({ fieldErrors: { name: 'Informe o nome.' } }));
    render(<StudentForm action={action} />);

    const form = screen.getByRole('button', { name: 'Salvar' }).closest('form');
    expect(form).not.toBeNull();
    if (!form) return;
    fireEvent.submit(form);

    const message = await screen.findByRole('alert');
    expect(message).toHaveTextContent('Informe o nome.');
    expect(message).toHaveAttribute('id', 'name-error');
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-describedby', 'name-error');
  });
});
