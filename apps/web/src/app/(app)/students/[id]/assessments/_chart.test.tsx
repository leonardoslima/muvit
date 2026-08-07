import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EvolutionChart } from './_chart';

describe('EvolutionChart', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza pontos com datas repetidas sem warning de key duplicada', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <EvolutionChart
        points={[
          { date: '2026-06-24', weight: 68.4, bodyFat: 24.5 },
          { date: '2026-06-24', weight: 68.1, bodyFat: 24.2 },
          { date: '2026-06-25', weight: 67.9, bodyFat: 24.1 },
        ]}
      />,
    );

    const hasDuplicateKeyWarning = consoleError.mock.calls.some((args) =>
      args.join(' ').includes('Encountered two children with the same key'),
    );

    expect(hasDuplicateKeyWarning).toBe(false);
  });

  it('explica quando não há duas observações da mesma métrica', () => {
    render(<EvolutionChart points={[{ date: '2026-06-24', weight: 68.4, bodyFat: null }]} />);

    expect(screen.getByText('Sem dados suficientes para o gráfico.')).toBeInTheDocument();
  });

  it('expõe uma descrição acessível quando há série comparável', () => {
    render(
      <EvolutionChart
        points={[
          { date: '2026-05-24', weight: 70, bodyFat: 20 },
          { date: '2026-06-24', weight: 68.4, bodyFat: 18 },
        ]}
      />,
    );

    expect(
      screen.getByRole('img', { name: 'Evolução de peso e percentual de gordura' }),
    ).toBeInTheDocument();
  });
});
