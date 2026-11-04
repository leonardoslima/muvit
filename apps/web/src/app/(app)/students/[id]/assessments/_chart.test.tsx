import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MetricEvolutionChart } from './_chart';

describe('MetricEvolutionChart', () => {
  afterEach(() => vi.restoreAllMocks());

  it('expõe resumo, tendência e todos os pontos em tabela acessível', () => {
    render(
      <MetricEvolutionChart
        title="Peso ao longo do tempo"
        metricLabel="Peso"
        unit="kg"
        color="var(--primary)"
        points={[
          { date: '2026-04-24', value: 70 },
          { date: '2026-05-24', value: null },
          { date: '2026-06-24', value: 68.4 },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Peso ao longo do tempo' })).toBeInTheDocument();
    expect(screen.getByText('Atual: 68,4 kg')).toBeInTheDocument();
    expect(screen.getByText('Variação: −1,6 kg')).toBeInTheDocument();
    expect(screen.getByText('Tendência de redução')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Dados de evolução de Peso' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByText('24/04/2026')).toBeInTheDocument();
    expect(within(table).getByText('24/06/2026')).toBeInTheDocument();
    expect(within(table).getByText('−1,6 kg')).toBeInTheDocument();
  });

  it('mantém um estado honesto quando a métrica não foi registrada', () => {
    render(
      <MetricEvolutionChart
        title="Gordura corporal ao longo do tempo"
        metricLabel="Gordura corporal"
        unit="%"
        color="var(--secondary)"
        points={[{ date: '2026-06-24', value: null }]}
      />,
    );

    expect(screen.getByText('Sem dados de gordura corporal registrados.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renderiza datas repetidas sem warning de key duplicada', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MetricEvolutionChart
        title="Peso ao longo do tempo"
        metricLabel="Peso"
        unit="kg"
        color="var(--primary)"
        points={[
          { date: '2026-06-24', value: 68.4 },
          { date: '2026-06-24', value: 68.1 },
          { date: '2026-06-25', value: 67.9 },
        ]}
      />,
    );

    expect(
      consoleError.mock.calls.some((args) =>
        args.join(' ').includes('Encountered two children with the same key'),
      ),
    ).toBe(false);
  });
});
