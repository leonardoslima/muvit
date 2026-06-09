import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingWizard } from './onboarding-wizard';

describe('OnboardingWizard', () => {
  it('renders the three trainer onboarding steps', () => {
    render(<OnboardingWizard completeAction={vi.fn()} />);

    expect(screen.getByText('Perfil')).toBeInTheDocument();
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
