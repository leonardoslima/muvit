import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingWizard } from './onboarding-wizard';

describe('OnboardingWizard', () => {
  it('renders only onboarding steps backed by real application flows', () => {
    render(<OnboardingWizard completeAction={vi.fn()} />);

    expect(screen.queryByText('Perfil')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nome publico')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Foto')).not.toBeInTheDocument();
    expect(screen.getByText('Passo 1')).toBeInTheDocument();
    expect(screen.getByText('Passo 2')).toBeInTheDocument();
    expect(screen.getByText('Primeiro aluno')).toBeInTheDocument();
    expect(screen.getByText('Primeiro treino')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /adicionar aluno/i })).toHaveAttribute(
      'href',
      '/students/new',
    );
    expect(screen.getByRole('link', { name: /montar treino/i })).toHaveAttribute(
      'href',
      '/workouts/new',
    );
  });
});
