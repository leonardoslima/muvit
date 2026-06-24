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
      students: { total: 1, active: 1, paused: 0, inactive: 0, newThisWeek: 1 },
      workouts: { activePlans: 1 },
      assessments: { last30d: 1 },
    }),
  );
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

  it('mantem os proximos passos antes da lista de estudantes', async () => {
    render(await DashboardPage());

    const nextStepsHeading = screen.getByRole('heading', { name: 'Próximos passos' });
    const studentsSection = screen.getByRole('region', { name: 'Lista de alunos' });

    expect(
      nextStepsHeading.compareDocumentPosition(studentsSection) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
