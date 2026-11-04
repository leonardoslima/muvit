import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { StatCard, statCardIconVariants } from './stat-card';

describe('StatCard', () => {
  it('renderiza label, valor e dica opcional', () => {
    render(<StatCard icon={Activity} label="Alunos ativos" value={12} hint="+2 no mes" />);

    expect(screen.getByRole('article', { name: 'Alunos ativos' })).toBeInTheDocument();
    expect(screen.getByText('Alunos ativos')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('+2 no mes')).toBeInTheDocument();
  });

  it('omite a dica quando ela nao e informada', () => {
    render(<StatCard icon={Activity} label="Treinos" value="8" />);

    expect(screen.getByText('Treinos')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.queryByText('+2 no mes')).not.toBeInTheDocument();
  });

  it('aplica variantes de destaque com CVA', () => {
    render(<StatCard icon={Activity} label="Alertas" value={3} accent="destructive" />);

    expect(screen.getByText('Alertas').nextElementSibling).toHaveClass(
      'text-destructive',
      'bg-destructive-bg',
    );
  });

  it('exporta o helper de variantes do icone para composicoes', () => {
    expect(statCardIconVariants({ accent: 'info' })).toContain('text-info');
    expect(statCardIconVariants({ accent: 'info' })).toContain('bg-info-bg');
  });
});
