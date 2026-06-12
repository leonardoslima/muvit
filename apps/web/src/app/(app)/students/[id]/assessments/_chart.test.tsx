import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EvolutionChart } from './_chart';

describe('EvolutionChart', () => {
  it('renders empty-state copy when there is not enough data', () => {
    render(<EvolutionChart points={[{ date: '2026-06-12', weight: 80, bodyFat: null }]} />);

    expect(screen.getByText(/sem dados suficientes/i)).toBeInTheDocument();
  });

  it('renders a labelled svg chart for enough data', () => {
    render(
      <EvolutionChart
        points={[
          { date: '2026-06-01', weight: 82, bodyFat: 20 },
          { date: '2026-06-08', weight: 81, bodyFat: 19 },
        ]}
      />,
    );

    expect(screen.getByText('Peso (kg)')).toBeInTheDocument();
    expect(screen.getByText('% Gordura')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Evolucao de peso e percentual de gordura' }),
    ).toBeInTheDocument();
  });
});
