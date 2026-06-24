import {
  getStudentsById,
  getStudentsByStudentIdAssessments,
  getStudentsByStudentIdWorkoutPlans,
} from '@/lib/api/sdk.gen';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteStudentAction } from './actions';
import StudentDetailPage from './page';

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
        phone: null,
        birthDate: null,
        gender: 'female',
        goals: null,
        restrictions: null,
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
            measurements: null,
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
      query: { limit: 3 },
    });
    expect(getStudentsByStudentIdWorkoutPlans).toHaveBeenCalledWith({
      client: {},
      path: { studentId: 'student-1' },
    });
    expect(screen.getByRole('heading', { name: 'Avaliações' })).toBeInTheDocument();
    expect(screen.getByText('20/06/2026')).toBeInTheDocument();
    expect(screen.getByText('72.5 kg')).toBeInTheDocument();
    expect(screen.getByText('18.2% gordura')).toBeInTheDocument();
    expect(screen.getByText('Evoluindo bem')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Treinos ativos' })).toBeInTheDocument();
    const workoutLink = screen.getByRole('link', { name: /Hipertrofia A\/B/i });
    expect(workoutLink).toHaveAttribute('href', '/workouts/workout-1');
    expect(within(workoutLink).getByText('Ativo')).toBeInTheDocument();
  });
});
