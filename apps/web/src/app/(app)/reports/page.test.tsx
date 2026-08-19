import { getStudentReport, getStudents } from '@/lib/api/sdk.gen';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsPage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({ getStudents: vi.fn(), getStudentReport: vi.fn() }));

const request = new Request('http://localhost');
const response = new Response();

function apiOk<T>(data: T) {
  return { data, request, response };
}

const student = {
  id: '11111111-1111-4111-8111-111111111111',
  trainerId: 'trainer-1',
  isIndependent: false,
  name: 'Maria Silva',
  email: 'maria@muvit.test',
  phone: null,
  birthDate: null,
  gender: 'female' as const,
  goals: null,
  trainingDays: 3,
  restrictions: null,
  status: 'active' as const,
  avatarUrl: 'https://cdn.muvit.test/maria.jpg',
  expoPushToken: null,
  createdAt: '2026-01-01T12:00:00.000Z',
  internalNotes: null,
};

function studentForIndex(index: number) {
  const suffix = index.toString().padStart(12, '0');
  return {
    ...student,
    id: `00000000-0000-4000-8000-${suffix}`,
    name: `Aluno ${index.toString().padStart(3, '0')}`,
    email: `aluno${index}@muvit.test`,
  };
}

const completeReport = {
  student: { id: student.id, name: student.name, avatarUrl: student.avatarUrl },
  period: { range: '90d' as const, from: '2026-01-01', to: '2026-03-31' },
  physicalEvolution: {
    hasEnoughData: true,
    points: [
      {
        date: '2026-01-15',
        weightKg: 82.3,
        bodyFatPct: 18.2,
        measurements: { waist: 86, armRight: 33 },
      },
      {
        date: '2026-03-15',
        weightKg: 78.1,
        bodyFatPct: 16.4,
        measurements: { waist: 82.5, armRight: 34.2 },
      },
    ],
    changes: { weightKg: -4.2, bodyFatPct: -1.8, waistCm: -3.5, armCm: 1.2 },
  },
  beforeAfter: {
    hasEnoughData: true,
    before: { date: '2026-01-15', photoUrl: 'https://cdn.muvit.test/before.jpg' },
    after: { date: '2026-03-15', photoUrl: 'https://cdn.muvit.test/after.jpg' },
  },
  workoutAdherence: { hasEnoughData: true, completed: 18, planned: 24, percentage: 75 },
  trainingFrequency: {
    hasEnoughData: true,
    days: [
      { date: '2026-03-01', count: 1 },
      { date: '2026-03-03', count: 2 },
    ],
  },
  topExercises: {
    hasEnoughData: true,
    items: [
      {
        exerciseId: 'exercise-1',
        name: 'Agachamento livre',
        maxLoadKg: 120,
        totalSets: 48,
        totalVolumeKg: 18_400,
        progression: [
          { date: '2026-01-10', loadKg: 100 },
          { date: '2026-03-10', loadKg: 120 },
        ],
      },
    ],
  },
  rpeTrend: {
    hasEnoughData: true,
    points: [
      { date: '2026-03-01', averageRpe: 7 },
      { date: '2026-03-08', averageRpe: 7.5 },
    ],
  },
  summary: 'Maria concluiu 18 de 24 treinos planejados e apresentou evolução física no período.',
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('explica o estado vazio quando o treinador ainda não possui alunos', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [], total: 0 }));
    vi.mocked(getStudentReport).mockRejectedValue(
      new Error('A API de relatório não deve ser consultada sem aluno.'),
    );

    render(await ReportsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole('heading', { name: 'Relatórios' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum aluno disponível para gerar relatórios.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar aluno' })).toHaveAttribute(
      'href',
      '/students/new',
    );
  });

  it('solicita seleção explícita antes de carregar um relatório', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student], total: 1 }));
    vi.mocked(getStudentReport).mockRejectedValue(
      new Error('A API de relatório não deve ser consultada sem seleção.'),
    );

    render(await ReportsPage({ searchParams: Promise.resolve({ range: '90d' }) }));

    expect(screen.getByLabelText('Aluno')).toHaveValue('');
    expect(screen.getByText('Selecione um aluno para visualizar o relatório.')).toBeInTheDocument();
  });

  it('carrega por URL um aluno válido além da primeira página sem usar lista parcial como ownership', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => studentForIndex(index + 1));
    const targetStudent = studentForIndex(101);
    vi.mocked(getStudents).mockImplementation(async (options) => {
      const offset = options?.query?.offset ?? 0;
      if (offset === 0) return apiOk({ items: firstPage, total: 101 });
      if (offset === 100) return apiOk({ items: [targetStudent], total: 101 });
      throw new Error(`Página de alunos inesperada: ${offset}`);
    });
    vi.mocked(getStudentReport).mockResolvedValue(
      apiOk({
        ...completeReport,
        student: {
          id: targetStudent.id,
          name: targetStudent.name,
          avatarUrl: targetStudent.avatarUrl,
        },
      }),
    );

    render(
      await ReportsPage({
        searchParams: Promise.resolve({ studentId: targetStudent.id, range: '90d' }),
      }),
    );

    const options = screen.getAllByRole('option');
    expect(options.at(-1)).toHaveTextContent('Aluno 101');
    expect(screen.getByLabelText('Aluno')).toHaveValue(targetStudent.id);
    expect(screen.getByText('Relatório de')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir versão para impressão' })).toHaveAttribute(
      'href',
      `/reports/print?studentId=${targetStudent.id}&range=90d`,
    );
  });

  it('bloqueia intervalo customizado inválido e foca o primeiro campo relevante', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student], total: 1 }));
    vi.mocked(getStudentReport).mockRejectedValue(
      new Error('A API de relatório não deve receber intervalo inválido.'),
    );

    render(
      await ReportsPage({
        searchParams: Promise.resolve({
          studentId: student.id,
          range: 'custom',
          from: '2026-03-20',
          to: '2026-03-01',
        }),
      }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A data inicial não pode ser posterior à data final.',
    );
    expect(screen.getByLabelText('Data inicial')).toHaveFocus();
  });

  it('apresenta todos os agregados reais com alternativas acessíveis aos gráficos', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student], total: 1 }));
    vi.mocked(getStudentReport).mockResolvedValue(apiOk(completeReport));

    render(
      await ReportsPage({
        searchParams: Promise.resolve({ studentId: student.id, range: '90d' }),
      }),
    );

    expect(screen.getByRole('heading', { name: 'Evolução física' })).toBeInTheDocument();
    expect(screen.getByAltText('Foto de perfil de Maria Silva')).toHaveAttribute(
      'src',
      'https://cdn.muvit.test/maria.jpg',
    );
    expect(screen.getByRole('table', { name: 'Dados de evolução física' })).toBeInTheDocument();
    expect(screen.getByAltText('Foto inicial de Maria Silva em 15/01/2026')).toHaveAttribute(
      'src',
      'https://cdn.muvit.test/before.jpg',
    );
    expect(screen.getByAltText('Foto final de Maria Silva em 15/03/2026')).toHaveAttribute(
      'src',
      'https://cdn.muvit.test/after.jpg',
    );
    expect(screen.getByText('18 de 24 treinos planejados concluídos')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Frequência de treinos' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Desempenho por exercício' })).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Tendência de esforço percebido' }),
    ).toBeInTheDocument();
    expect(screen.getByText(completeReport.summary)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir versão para impressão' })).toHaveAttribute(
      'href',
      '/reports/print?studentId=11111111-1111-4111-8111-111111111111&range=90d',
    );
  });

  it('mantém cada seção útil com mensagem própria quando faltam dados', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student], total: 1 }));
    vi.mocked(getStudentReport).mockResolvedValue(
      apiOk({
        ...completeReport,
        physicalEvolution: {
          hasEnoughData: false,
          points: [],
          changes: { weightKg: null, bodyFatPct: null, waistCm: null, armCm: null },
        },
        beforeAfter: { hasEnoughData: false, before: null, after: null },
        workoutAdherence: {
          hasEnoughData: false,
          completed: 0,
          planned: 0,
          percentage: null,
        },
        trainingFrequency: { hasEnoughData: false, days: [] },
        topExercises: { hasEnoughData: false, items: [] },
        rpeTrend: { hasEnoughData: false, points: [] },
        summary: 'Ainda não há dados suficientes para resumir o período.',
      }),
    );

    render(
      await ReportsPage({
        searchParams: Promise.resolve({ studentId: student.id, range: '90d' }),
      }),
    );

    expect(screen.getByText('Dados físicos insuficientes neste período.')).toBeInTheDocument();
    expect(screen.getByText('Ainda não há duas fotos para comparação.')).toBeInTheDocument();
    expect(screen.getByText('Aderência ainda sem dados suficientes.')).toBeInTheDocument();
    expect(screen.getByText('Frequência ainda sem dados suficientes.')).toBeInTheDocument();
    expect(screen.getByText('Exercícios ainda sem dados suficientes.')).toBeInTheDocument();
    expect(screen.getByText('RPE ainda sem dados suficientes.')).toBeInTheDocument();
  });

  it('traduz falha remota sem expor detalhes internos', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student], total: 1 }));
    vi.mocked(getStudentReport).mockResolvedValue({
      data: undefined,
      error: { error: 'stack interno' },
      request,
      response: new Response(null, { status: 500 }),
    });

    render(
      await ReportsPage({
        searchParams: Promise.resolve({ studentId: student.id, range: '90d' }),
      }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar o relatório.');
    expect(screen.queryByText('stack interno')).not.toBeInTheDocument();
  });
});
