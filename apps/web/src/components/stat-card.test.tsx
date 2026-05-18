import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  it('renderiza label, valor e dica opcional', () => {
    render(<StatCard icon={Activity} label="Alunos ativos" value={12} hint="+2 no mes" />);

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
});
