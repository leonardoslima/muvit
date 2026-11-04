import type { GetStudentReportResponse } from '@/lib/api/types.gen';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkoutPerformance } from './_workout-performance';

const report = {
  student: {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Maria Silva',
    avatarUrl: null,
  },
  period: { range: 'custom', from: '2026-03-01', to: '2026-03-31' },
  physicalEvolution: {
    hasEnoughData: false,
    points: [],
    changes: { weightKg: null, bodyFatPct: null, waistCm: null, armCm: null },
  },
  beforeAfter: { hasEnoughData: false, before: null, after: null },
  workoutAdherence: { hasEnoughData: true, completed: 2, planned: 3, percentage: 66.7 },
  trainingFrequency: {
    hasEnoughData: true,
    days: [
      { date: '2026-03-01', count: 1 },
      { date: '2026-03-31', count: 2 },
    ],
  },
  topExercises: {
    hasEnoughData: true,
    items: [
      {
        exerciseId: 'exercise-1',
        name: 'Agachamento livre',
        maxLoadKg: 120.5,
        totalSets: 48,
        totalVolumeKg: 18_400,
        progression: [
          { date: '2026-03-01', loadKg: 100 },
          { date: '2026-03-15', loadKg: 80 },
          { date: '2026-03-31', loadKg: 120 },
        ],
      },
    ],
  },
  rpeTrend: { hasEnoughData: false, points: [] },
  summary: 'Resumo.',
} satisfies GetStudentReportResponse;

describe('WorkoutPerformance', () => {
  it('preserva todos os pontos e datas da trajetória de carga do exercício', () => {
    render(<WorkoutPerformance report={report} />);

    const progression = screen.getByRole('list', {
      name: 'Progressão de carga de Agachamento livre',
    });
    const points = within(progression).getAllByRole('listitem');
    expect(points).toHaveLength(3);
    expect(points[0]).toHaveTextContent('01/03/2026: 100 kg');
    expect(points[1]).toHaveTextContent('15/03/2026: 80 kg');
    expect(points[2]).toHaveTextContent('31/03/2026: 120 kg');

    const exerciseRow = screen.getByRole('row', { name: /Agachamento livre/ });
    expect(exerciseRow).toHaveTextContent('120,5 kg');
    expect(exerciseRow).toHaveTextContent('48');
    expect(exerciseRow).toHaveTextContent('18.400 kg');
  });

  it('mantém todos os dias do período no eixo temporal sem inventar treinos nas lacunas', () => {
    render(<WorkoutPerformance report={report} />);

    const calendar = screen.getByRole('list', { name: 'Calendário de frequência de treinos' });
    expect(within(calendar).getAllByRole('listitem')).toHaveLength(31);
    expect(
      within(calendar).getByRole('listitem', { name: '01/03/2026: 1 treino' }),
    ).toBeInTheDocument();
    expect(
      within(calendar).getByRole('listitem', { name: '15/03/2026: nenhum treino' }),
    ).toBeInTheDocument();
    expect(
      within(calendar).getByRole('listitem', { name: '31/03/2026: 2 treinos' }),
    ).toBeInTheDocument();
  });

  it('deriva no período completo as lacunas entre os limites reais disponíveis', () => {
    render(
      <WorkoutPerformance report={{ ...report, period: { range: 'all', from: null, to: null } }} />,
    );

    const calendar = screen.getByRole('list', { name: 'Calendário de frequência de treinos' });
    expect(within(calendar).getAllByRole('listitem')).toHaveLength(31);
    expect(
      within(calendar).getByRole('listitem', { name: '15/03/2026: nenhum treino' }),
    ).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Frequência de treinos' });
    expect(within(table).getByRole('row', { name: '15/03/2026 Nenhum' })).toBeInTheDocument();
  });

  it('distingue registros de progressão com a mesma data e carga', () => {
    render(
      <WorkoutPerformance
        report={{
          ...report,
          topExercises: {
            ...report.topExercises,
            items: [
              {
                exerciseId: 'exercise-1',
                name: 'Agachamento livre',
                maxLoadKg: 100,
                totalSets: 2,
                totalVolumeKg: 2_000,
                progression: [
                  { date: '2026-03-01', loadKg: 100 },
                  { date: '2026-03-01', loadKg: 100 },
                ],
              },
            ],
          },
        }}
      />,
    );

    const progression = screen.getByRole('list', {
      name: 'Progressão de carga de Agachamento livre',
    });
    expect(
      within(progression).getByRole('listitem', {
        name: 'Registro 1: 01/03/2026, 100 kg',
      }),
    ).toBeInTheDocument();
    expect(
      within(progression).getByRole('listitem', {
        name: 'Registro 2: 01/03/2026, 100 kg',
      }),
    ).toBeInTheDocument();
  });
});
