import { render, screen } from '@testing-library/react';
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
          restrictions: 'Joelho',
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
    expect(screen.getByLabelText(/Restri/i)).toHaveValue('Joelho');
    expect(screen.getByRole('button', { name: 'Atualizar aluno' })).toBeEnabled();
  });

  it('renders the empty create form with required name', () => {
    render(<StudentForm action={vi.fn()} />);

    expect(screen.getByLabelText('Nome')).toBeRequired();
    expect(screen.getByLabelText('Status')).toHaveValue('active');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });
});
