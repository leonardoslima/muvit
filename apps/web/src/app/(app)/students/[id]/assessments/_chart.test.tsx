import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MetricEvolutionChart } from './_chart';

describe('MetricEvolutionChart', () => {
  it('suprime evolução ambígua e preserva os valores brutos', () => {
    const assessmentId = 'c7a1f6b2-4b3e-4f1a-9e5c-2f8d1a7c9b10';
    render(
      <MetricEvolutionChart
        title="Peso"
        metricLabel="Peso"
        unit="kg"
        color="red"
        points={[
          { date: '2026-04-01', id: assessmentId, value: 80, dateAssessmentCount: 2 },
          { date: '2026-04-02', value: 78, dateAssessmentCount: 1 },
        ]}
      />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText(/Atual:/)).not.toBeInTheDocument();
    expect(screen.getByText('80 kg')).toBeInTheDocument();
    expect(screen.getByText('78 kg')).toBeInTheDocument();
    expect(screen.queryByText(/A ordem das medições não foi informada/)).not.toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Dados de evolução de Peso' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Data', 'Peso']);
    expect(within(table).queryByRole('columnheader', { name: 'Registro' })).not.toBeInTheDocument();
    expect(table).not.toHaveTextContent(assessmentId);
    expect(table).toHaveClass('w-full', 'text-sm');
    expect(table.parentElement).toHaveClass('overflow-x-auto');
  });
  it.each([0, 1, 2])('suprime linha com empate global na posição %s', (position) => {
    const points = ['2026-04-01', '2026-04-02', '2026-04-03'].map((date, index) => ({
      date,
      id: `record-${index}`,
      value: 80 - index,
      dateAssessmentCount: index === position ? 4 : 1,
    }));
    render(
      <MetricEvolutionChart
        title="Peso"
        metricLabel="Peso"
        unit="kg"
        color="red"
        points={points}
      />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText(/Atual:|Variação:|Tendência/)).not.toBeInTheDocument();
    expect(screen.queryByText(/A ordem das medições não foi informada/)).not.toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Dados de evolução de Peso' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(table).not.toHaveTextContent(/record-\d/);
  });
  afterEach(() => vi.restoreAllMocks());

  it('expõe resumo, tendência e todos os pontos em tabela acessível', () => {
    render(
      <MetricEvolutionChart
        title="Peso ao longo do tempo"
        metricLabel="Peso"
        unit="kg"
        color="var(--primary)"
        points={[
          { date: '2026-04-24', value: 70, dateAssessmentCount: 1 },
          { date: '2026-05-24', value: null, dateAssessmentCount: 1 },
          { date: '2026-06-24', value: 68.4, dateAssessmentCount: 1 },
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
        points={[{ date: '2026-06-24', value: null, dateAssessmentCount: 1 }]}
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
          { date: '2026-06-24', value: 68.4, dateAssessmentCount: 2 },
          { date: '2026-06-24', value: 68.1, dateAssessmentCount: 2 },
          { date: '2026-06-25', value: 67.9, dateAssessmentCount: 1 },
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
