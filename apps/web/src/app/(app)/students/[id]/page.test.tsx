import {
  getStudentsById,
  getStudentsByStudentIdAssessments,
  getStudentsByStudentIdWorkoutPlans,
} from '@/lib/api/sdk.gen';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteStudentAction } from './actions';
import StudentDetailPage, { buildWeightChartPoints } from './page';

vi.mock('@/components/student-form', () => ({ StudentForm: () => <div>Formulário</div> }));
vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({
  getStudentsById: vi.fn(),
  getStudentsByStudentIdAssessments: vi.fn(),
  getStudentsByStudentIdWorkoutPlans: vi.fn(),
}));
vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('./actions', () => ({ deleteStudentAction: vi.fn(), updateStudentAction: vi.fn() }));

function apiOk<T>(data: T) {
  return {
    data,
    error: undefined,
    request: new Request('https://api.test'),
    response: new Response(null, { status: 200 }),
  };
}

describe('StudentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStudentsById).mockResolvedValue(
      apiOk({
        id: 'student-1',
        trainerId: 'trainer-1',
        isIndependent: false,
        name: 'Ana Lima',
        email: 'ana@example.com',
        phone: '+55 11 90000-0000',
        birthDate: null,
        gender: 'female',
        goals: 'Ganhar massa muscular.',
        restrictions: 'Evitar impacto alto no joelho direito.',
        status: 'active',
        avatarUrl: null,
        expoPushToken: null,
        createdAt: '2026-06-20T00:00:00.000Z',
      }),
    );
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(
      apiOk({
        items: [
          {
            id: 'assessment-1',
            studentId: 'student-1',
            date: '2026-06-20',
            weightKg: '72.5',
            heightCm: '170',
            bodyFatPct: '18.2',
            measurements: {
              waist: 68,
              hip: 96,
              armRight: 28,
              thighRight: 54,
            },
            photos: null,
            notes: 'Evoluindo bem',
            createdAt: '2026-06-20T00:00:00.000Z',
          },
        ],
        total: 1,
      }),
    );
    vi.mocked(getStudentsByStudentIdWorkoutPlans).mockResolvedValue(
      apiOk({
        items: [
          {
            id: 'workout-1',
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
  });

  it('confirma a exclusão com o identificador do aluno', async () => {
    vi.mocked(deleteStudentAction).mockResolvedValue(undefined);
    render(await StudentDetailPage({ params: Promise.resolve({ id: 'student-1' }) }));

    fireEvent.click(screen.getByRole('button', { name: 'Excluir aluno' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Excluir aluno?' });
    expect(within(dialog).getByText(/Ana Lima/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir aluno' }));

    await waitFor(() => expect(deleteStudentAction).toHaveBeenCalledOnce());
    const formData = vi.mocked(deleteStudentAction).mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData?.get('id')).toBe('student-1');
  });

  it('mostra avaliacoes e treinos do aluno selecionado', async () => {
    render(await StudentDetailPage({ params: Promise.resolve({ id: 'student-1' }) }));

    expect(getStudentsByStudentIdAssessments).toHaveBeenCalledWith({
      client: {},
      path: { studentId: 'student-1' },
      query: { limit: 6 },
    });
    expect(getStudentsByStudentIdWorkoutPlans).toHaveBeenCalledWith({
      client: {},
      path: { studentId: 'student-1' },
    });
    expect(screen.getByRole('heading', { name: 'Última avaliação' })).toBeInTheDocument();
    expect(screen.getByText('20/06/2026')).toBeInTheDocument();
    expect(screen.getByText('72.5 kg')).toBeInTheDocument();
    expect(screen.getByText('18.2% gordura')).toBeInTheDocument();
    expect(screen.getByText('Evoluindo bem')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Treino ativo' })).toBeInTheDocument();
    const workoutLink = screen.getByRole('link', { name: /Hipertrofia A\/B/i });
    expect(workoutLink).toHaveAttribute('href', '/workouts/workout-1');
    expect(screen.getAllByText('Ativo').length).toBeGreaterThan(0);
  });

  it('renderiza o perfil do aluno no layout de overview do design', async () => {
    render(await StudentDetailPage({ params: Promise.resolve({ id: 'student-1' }) }));

    expect(screen.getByRole('link', { name: 'Alunos' })).toHaveAttribute('href', '/students');
    expect(screen.getByRole('heading', { name: 'Ana Lima' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Novo treino/i })).toHaveAttribute(
      'href',
      '/workouts/new?studentId=student-1',
    );
    expect(screen.getAllByRole('link', { name: /Nova avaliação/i })[0]).toHaveAttribute(
      'href',
      '/students/student-1/assessments/new',
    );

    expect(screen.getByRole('navigation', { name: 'Seções do aluno' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Visão geral' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Treinos' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Avaliações' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('tab', { name: 'Histórico' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByTestId('student-overview')).toHaveClass('xl:grid-cols-3');
    expect(screen.getByRole('heading', { name: 'Informações pessoais' })).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Evitar impacto alto no joelho direito.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Treino ativo' })).toBeInTheDocument();
    expect(screen.getByText('Hipertrofia A/B')).toBeInTheDocument();
    expect(screen.getByText('Treino A — Superior empurrar')).toBeInTheDocument();
    expect(screen.getByText('Peito · Ombros · Tríceps')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Última avaliação' })).toBeInTheDocument();
    expect(screen.getByText('Métricas principais')).toBeInTheDocument();
    expect(screen.getByText('Medidas')).toBeInTheDocument();
    expect(screen.getByText('Cintura')).toBeInTheDocument();
    expect(screen.getByText('68 cm')).toBeInTheDocument();
    expect(screen.getByText('Evolução de peso')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Evolução de peso' })).toBeInTheDocument();
    expect(screen.getByText('Peso mais recente: 72,5 kg.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver histórico' })).toHaveAttribute(
      'href',
      '/students/student-1/assessments',
    );
    expect(screen.queryByRole('heading', { name: 'Dados do aluno' })).not.toBeInTheDocument();
    expect(screen.queryByText('Formulário')).not.toBeInTheDocument();
  });

  it('renderiza o grafico de peso com avaliacoes no mesmo dia sem warning de key duplicada', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(
      apiOk({
        items: [
          {
            id: 'assessment-1',
            studentId: 'student-1',
            date: '2026-06-24',
            weightKg: '72.5',
            heightCm: '170',
            bodyFatPct: '18.2',
            measurements: null,
            photos: null,
            notes: null,
            createdAt: '2026-06-24T08:00:00.000Z',
          },
          {
            id: 'assessment-2',
            studentId: 'student-1',
            date: '2026-06-24',
            weightKg: '72.1',
            heightCm: '170',
            bodyFatPct: '18.0',
            measurements: null,
            photos: null,
            notes: null,
            createdAt: '2026-06-24T10:00:00.000Z',
          },
          {
            id: 'assessment-3',
            studentId: 'student-1',
            date: '2026-06-25',
            weightKg: '71.9',
            heightCm: '170',
            bodyFatPct: '17.9',
            measurements: null,
            photos: null,
            notes: null,
            createdAt: '2026-06-25T08:00:00.000Z',
          },
        ],
        total: 3,
      }),
    );

    render(await StudentDetailPage({ params: Promise.resolve({ id: 'student-1' }) }));

    const hasDuplicateKeyWarning = consoleError.mock.calls.some((args) =>
      args.join(' ').includes('Encountered two children with the same key'),
    );

    expect(hasDuplicateKeyWarning).toBe(false);
    consoleError.mockRestore();
  });

  it('mantem a ordem da API em avaliacoes do mesmo dia ao montar o grafico de peso', () => {
    const assessments: Parameters<typeof buildWeightChartPoints>[0] = [
      {
        id: 'assessment-3',
        date: '2026-06-25',
        weightKg: '71.9',
        heightCm: '170',
        bodyFatPct: '17.9',
        measurements: null,
        notes: null,
      },
      {
        id: 'assessment-1',
        date: '2026-06-24',
        weightKg: '72.5',
        heightCm: '170',
        bodyFatPct: '18.2',
        measurements: null,
        notes: null,
      },
      {
        id: 'assessment-2',
        date: '2026-06-24',
        weightKg: '72.1',
        heightCm: '170',
        bodyFatPct: '18.0',
        measurements: null,
        notes: null,
      },
    ];

    expect(buildWeightChartPoints(assessments).map((point) => point.weight)).toEqual([
      72.5, 72.1, 71.9,
    ]);
  });
});
