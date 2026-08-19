import { getStudentReport } from '@/lib/api/sdk.gen';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PrintableReportPage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({ getStudentReport: vi.fn() }));

const request = new Request('http://localhost');
const response = new Response();

const report = {
  student: { id: 'student-1', name: 'Maria Silva', avatarUrl: null },
  period: { range: '90d' as const, from: '2026-01-01', to: '2026-03-31' },
  physicalEvolution: {
    hasEnoughData: false,
    points: [],
    changes: { weightKg: null, bodyFatPct: null, waistCm: null, armCm: null },
  },
  beforeAfter: { hasEnoughData: false, before: null, after: null },
  workoutAdherence: { hasEnoughData: false, completed: 0, planned: 0, percentage: null },
  trainingFrequency: { hasEnoughData: false, days: [] },
  topExercises: { hasEnoughData: false, items: [] },
  rpeTrend: { hasEnoughData: false, points: [] },
  summary: 'Ainda não há dados suficientes para resumir o período.',
};

describe('PrintableReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reutiliza o relatório autorizado e aguarda clique para imprimir', async () => {
    vi.mocked(getStudentReport).mockResolvedValue({ data: report, request, response });

    render(
      await PrintableReportPage({
        searchParams: Promise.resolve({ studentId: 'student-1', range: '90d' }),
      }),
    );

    expect(screen.getByRole('heading', { name: 'Relatório de Maria Silva' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Evolução física' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprimir ou salvar em PDF' })).toBeInTheDocument();
  });

  it('não consulta a API quando o intervalo customizado é inválido', async () => {
    vi.mocked(getStudentReport).mockRejectedValue(
      new Error('A API de relatório não deve receber uma query inválida.'),
    );

    render(
      await PrintableReportPage({
        searchParams: Promise.resolve({ studentId: 'student-1', range: 'custom' }),
      }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Informe as datas inicial e final.');
    expect(screen.getByRole('link', { name: 'Voltar aos relatórios' })).toHaveAttribute(
      'href',
      '/reports?studentId=student-1&range=custom',
    );
  });

  it('traduz a falha remota da versão imprimível sem expor detalhes internos', async () => {
    vi.mocked(getStudentReport).mockResolvedValue({
      data: undefined,
      error: { error: 'stack interno' },
      request,
      response: new Response(null, { status: 500 }),
    });

    render(
      await PrintableReportPage({
        searchParams: Promise.resolve({ studentId: 'student-1', range: '90d' }),
      }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar o relatório.');
    expect(screen.queryByText('stack interno')).not.toBeInTheDocument();
  });
});
