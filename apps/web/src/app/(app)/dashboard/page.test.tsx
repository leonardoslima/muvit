import {
  getStudents,
  getStudentsByStudentIdWorkoutLogs,
  getStudentsByStudentIdWorkoutPlans,
  getTrainerSummary,
} from '@/lib/api/sdk.gen';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';

vi.mock('@/components/top-bar', () => ({
  TopBar: ({ title }: { title: string }) => <div>{title}</div>,
}));
vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/auth-server', () => ({
  requireUser: vi.fn().mockResolvedValue({ id: 'trainer-1', name: 'Trainer Demo' }),
}));
vi.mock('@/lib/api/sdk.gen', () => ({
  getTrainerSummary: vi.fn(),
  getStudents: vi.fn(),
  getStudentsByStudentIdWorkoutLogs: vi.fn(),
  getStudentsByStudentIdWorkoutPlans: vi.fn(),
}));

function apiOk<T>(data: T) {
  return {
    data,
    error: undefined,
    request: new Request('https://api.test'),
    response: new Response(null, { status: 200 }),
  };
}

function apiError() {
  return {
    data: undefined,
    error: { message: 'Falha' },
    request: new Request('https://api.test'),
    response: new Response(null, { status: 500 }),
  };
}

function mockSummary() {
  vi.mocked(getTrainerSummary).mockResolvedValue(
    apiOk({
      students: {
        total: 1,
        active: 1,
        paused: 0,
        inactive: 0,
        newThisWeek: 1,
        inactive7d: 2,
      },
      workouts: { activePlans: 1, expiringThisWeek: 3 },
      assessments: { last30d: 1, pending: 4 },
    }),
  );
}

function mockSummaryZeros() {
  vi.mocked(getTrainerSummary).mockResolvedValue(
    apiOk({
      students: {
        total: 0,
        active: 0,
        paused: 0,
        inactive: 0,
        newThisWeek: 0,
        inactive7d: 0,
      },
      workouts: { activePlans: 0, expiringThisWeek: 0 },
      assessments: { last30d: 0, pending: 0 },
    }),
  );
}

function mockEmptyStudents() {
  vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [], total: 0 }));
}

function mockStudents(total = 1) {
  vi.mocked(getStudents).mockResolvedValue(
    apiOk({
      items: [
        {
          id: 'student-1',
          trainerId: 'trainer-1',
          isIndependent: false,
          name: 'Ana Lima',
          email: 'ana@example.com',
          phone: null,
          birthDate: null,
          gender: 'female',
          goals: null,
          trainingDays: null,
          restrictions: null,
          status: 'active',
          avatarUrl: null,
          expoPushToken: null,
          createdAt: '2026-06-20T00:00:00.000Z',
        },
      ],
      total,
    }),
  );
}

function mockStudentDetails() {
  vi.mocked(getStudentsByStudentIdWorkoutLogs).mockResolvedValue(
    apiOk({
      items: [
        {
          id: 'log-1',
          studentId: 'student-1',
          workoutDayId: 'day-1',
          date: '2026-06-20',
          durationMin: 45,
          rpe: 7,
          completed: true,
          createdAt: '2026-06-20T00:00:00.000Z',
        },
      ],
    }),
  );
  vi.mocked(getStudentsByStudentIdWorkoutPlans).mockResolvedValue(
    apiOk({
      items: [
        {
          id: 'plan-1',
          studentId: 'student-1',
          trainerId: 'trainer-1',
          name: 'Hipertrofia A/B',
          startDate: '2026-06-01',
          endDate: null,
          status: 'active',
          createdAt: '2026-06-20T00:00:00.000Z',
          days: [
            {
              id: 'day-1',
              planId: 'plan-1',
              label: 'Treino A',
              dayOrder: 1,
            },
          ],
        },
      ],
    }),
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSummary();
    mockStudents();
    mockStudentDetails();
  });

  it('renderiza a lista de alunos em pt-BR com controles sem placeholder ativo', async () => {
    render(await DashboardPage());

    expect(getStudents).toHaveBeenCalledWith({
      client: {},
      query: { limit: 5 },
    });
    expect(getStudentsByStudentIdWorkoutLogs).toHaveBeenCalledWith({
      client: {},
      path: { studentId: 'student-1' },
      query: { limit: 1 },
    });
    expect(getStudentsByStudentIdWorkoutPlans).toHaveBeenCalledWith({
      client: {},
      path: { studentId: 'student-1' },
    });

    const section = screen.getByRole('region', { name: 'Lista de alunos' });
    expect(section.querySelector('[data-slot="card"]')).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: 'Lista de alunos' })).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'Filtrar' })).toHaveAttribute(
      'href',
      '/students',
    );
    expect(within(section).getByRole('button', { name: 'Exportar indisponível' })).toBeDisabled();

    const table = within(section).getByRole('table', { name: 'Lista de alunos' });
    expect(within(table).getByRole('columnheader', { name: 'ALUNO' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'ÚLTIMO TREINO' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'PLANO ATUAL' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'STATUS' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'AÇÃO' })).toBeInTheDocument();
    expect(within(table).getByText('Ana Lima')).toBeInTheDocument();
    expect(within(table).getByText('20 jun 2026')).toBeInTheDocument();
    expect(within(table).getByText('Hipertrofia A/B')).toBeInTheDocument();
    expect(within(table).getByText('Ativo')).toBeInTheDocument();
    const openLink = within(table).getByRole('link', { name: 'Abrir Ana Lima' });
    expect(openLink).toHaveAttribute('href', '/students/student-1');
    expect(openLink).toHaveClass('inline-flex');
    expect(within(section).getByText('Mostrando 1 de 1 alunos')).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(within(section).getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('mantém as quatro métricas antes da Lista de alunos', async () => {
    render(await DashboardPage());

    const metrics = screen.getAllByRole('article', {
      name: /^(Alunos ativos|Vencendo esta semana|Avaliações pendentes|Inativos \(7\+ dias\))$/,
    });
    const studentsHeading = screen.getByRole('heading', { name: 'Lista de alunos' });
    const lastMetric = metrics.at(-1);

    expect(metrics).toHaveLength(4);
    expect(lastMetric).toBeDefined();
    if (!lastMetric) throw new Error('A quarta métrica não foi renderizada.');
    expect(
      lastMetric.compareDocumentPosition(studentsHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Próximos passos' })).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Vencendo esta semana' })).toHaveTextContent('3');
    expect(screen.getByRole('article', { name: 'Avaliações pendentes' })).toHaveTextContent('4');
    expect(screen.getByRole('article', { name: 'Inativos (7+ dias)' })).toHaveTextContent('2');
  });

  it('oferece caminho real para ver mais alunos quando existe outra pagina', async () => {
    mockStudents(6);

    render(await DashboardPage());

    const section = screen.getByRole('region', { name: 'Lista de alunos' });
    expect(within(section).getByRole('link', { name: '2' })).toHaveAttribute('href', '/students');
    expect(within(section).getByRole('link', { name: 'Próxima' })).toHaveAttribute(
      'href',
      '/students',
    );
  });

  it('mostra erro claro quando a lista de alunos falha', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiError());

    render(await DashboardPage());

    expect(screen.getByRole('region', { name: 'Lista de alunos' })).toHaveTextContent(
      'Não foi possível carregar a lista de alunos.',
    );
  });

  it('isola indisponibilidade do resumo e mantém a lista carregada', async () => {
    vi.mocked(getTrainerSummary).mockResolvedValue(apiError());

    render(await DashboardPage());

    expect(screen.getByRole('alert')).toHaveTextContent('Indicadores indisponíveis');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os indicadores. Tente novamente em alguns instantes.',
    );
    expect(screen.getByRole('link', { name: 'Tentar novamente' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.queryByText('Todas em dia')).not.toBeInTheDocument();
    expect(screen.queryByText('Todos em movimento')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhum vencimento')).not.toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 1 alunos')).toBeInTheDocument();
  });

  it('trata rejeição e ausência de data do resumo como indisponibilidade', async () => {
    vi.mocked(getTrainerSummary).mockRejectedValue(new Error('network down'));
    const rejected = render(await DashboardPage());

    expect(screen.getByRole('alert')).toHaveTextContent('Indicadores indisponíveis');
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    rejected.unmount();

    vi.mocked(getTrainerSummary).mockResolvedValue({
      data: undefined,
      error: undefined,
      request: new Request('https://api.test'),
      response: new Response(null, { status: 200 }),
    });
    render(await DashboardPage());

    expect(screen.getByRole('alert')).toHaveTextContent('Indicadores indisponíveis');
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('mantém métricas e hints positivos quando o resumo traz zeros reais', async () => {
    mockSummaryZeros();

    render(await DashboardPage());

    const metrics = screen.getAllByRole('article');
    expect(metrics).toHaveLength(4);
    expect(screen.getByText('Todas em dia')).toBeInTheDocument();
    expect(screen.getByText('Todos em movimento')).toBeInTheDocument();
    expect(screen.getByText('Nenhum vencimento')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    for (const metric of metrics) expect(metric).toHaveTextContent('0');
  });

  it('mantém as métricas e remove rodapé e paginação quando só a lista falha', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiError());

    render(await DashboardPage());

    const section = screen.getByRole('region', { name: 'Lista de alunos' });
    expect(within(section).getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a lista de alunos.',
    );
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(within(section).queryByText('Mostrando 0 de 0 alunos')).not.toBeInTheDocument();
    expect(within(section).queryByText('Nenhum aluno encontrado.')).not.toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Anterior' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Próxima' })).not.toBeInTheDocument();
  });

  it('trata falha simultânea das duas seções sem inventar zeros ou vazio', async () => {
    vi.mocked(getTrainerSummary).mockResolvedValue(apiError());
    vi.mocked(getStudents).mockResolvedValue(apiError());

    render(await DashboardPage());

    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.queryByText('Mostrando 0 de 0 alunos')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhum aluno encontrado.')).not.toBeInTheDocument();
  });

  it('recupera a lista de erro para dados reais e volta ao erro sem reter valor antigo', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiError());
    const failed = render(await DashboardPage());
    expect(
      within(screen.getByRole('region', { name: 'Lista de alunos' })).getByRole('alert'),
    ).toHaveTextContent('Não foi possível carregar a lista de alunos.');
    failed.unmount();

    mockStudents();
    const recovered = render(await DashboardPage());
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 1 alunos')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    recovered.unmount();

    vi.mocked(getStudents).mockResolvedValue(apiError());
    render(await DashboardPage());
    expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Lista de alunos' })).getByRole('alert'),
    ).toBeInTheDocument();
  });

  it('recupera a lista do erro para carteira realmente vazia restaurando a apresentação', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiError());
    const failed = render(await DashboardPage());
    expect(
      within(screen.getByRole('region', { name: 'Lista de alunos' })).getByRole('alert'),
    ).toBeInTheDocument();
    failed.unmount();

    mockEmptyStudents();
    render(await DashboardPage());

    const section = screen.getByRole('region', { name: 'Lista de alunos' });
    expect(within(section).getByText('Nenhum aluno encontrado.')).toBeInTheDocument();
    expect(within(section).getByText('Mostrando 0 de 0 alunos')).toBeInTheDocument();
    expect(within(section).queryByRole('alert')).not.toBeInTheDocument();
  });
});
