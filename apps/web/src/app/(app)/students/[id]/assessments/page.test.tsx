import { getStudentsById, getStudentsByStudentIdAssessments } from '@/lib/api/sdk.gen';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AssessmentsListPage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({
  getStudentsById: vi.fn(),
  getStudentsByStudentIdAssessments: vi.fn(),
}));
vi.mock('next/navigation', () => ({ notFound: vi.fn() }));

function apiOk<T>(data: T) {
  return {
    data,
    error: undefined,
    request: new Request('https://api.test'),
    response: new Response(),
  };
}

const student = {
  id: 'student-1',
  trainerId: 'trainer-1',
  isIndependent: false,
  name: 'Maria Costa',
  email: 'maria@example.com',
  phone: null,
  birthDate: null,
  gender: 'female' as const,
  goals: null,
  restrictions: null,
  status: 'active' as const,
  avatarUrl: null,
  expoPushToken: null,
  createdAt: '2026-01-01T12:00:00.000Z',
};
const assessment = {
  id: 'assessment-1',
  studentId: 'student-1',
  date: '2026-03-15',
  weightKg: 62.5,
  heightCm: 167,
  bodyFatPct: 18,
  measurements: null,
  photos: null,
  notes: null,
  createdAt: '2026-03-15T12:00:00.000Z',
};

describe('AssessmentsListPage', () => {
  beforeEach(() => {
    vi.mocked(getStudentsById).mockResolvedValue(apiOk(student));
  });

  it('mostra um estado de erro sem transformar falha em histórico vazio', async () => {
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue({
      data: undefined,
      error: { message: 'network' },
      request: new Request('https://api.test'),
      response: new Response(null, { status: 500 }),
    });

    render(await AssessmentsListPage({ params: Promise.resolve({ id: 'student-1' }) }));

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as avaliações.');
    expect(screen.queryByText('Nenhuma avaliação registrada ainda.')).not.toBeInTheDocument();
  });

  it('oferece registrar a primeira avaliação no estado vazio', async () => {
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(apiOk({ items: [], total: 0 }));

    render(await AssessmentsListPage({ params: Promise.resolve({ id: 'student-1' }) }));

    expect(screen.getByText('Nenhuma avaliação registrada ainda.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registrar primeira avaliação' })).toHaveAttribute(
      'href',
      '/students/student-1/assessments/new',
    );
  });

  it('exibe a avaliação única sem inventar comparação, medidas ou fotos', async () => {
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(
      apiOk({ items: [assessment], total: 1 }),
    );

    render(await AssessmentsListPage({ params: Promise.resolve({ id: 'student-1' }) }));

    expect(screen.getByText('Dados insuficientes para comparar avaliações.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma medida de circunferência registrada.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma foto de progresso registrada.')).toBeInTheDocument();
    expect(
      screen.queryByRole('table', { name: 'Comparação de avaliações' }),
    ).not.toBeInTheDocument();
  });

  it('compara os últimos registros e mantém a estrutura responsiva', async () => {
    const latest = {
      ...assessment,
      id: 'assessment-2',
      date: '2026-05-15',
      weightKg: 60,
      bodyFatPct: 16,
      measurements: { waist: 74, armRight: 32 },
      photos: ['https://cdn.test/front.jpg'],
    };
    vi.mocked(getStudentsByStudentIdAssessments).mockResolvedValue(
      apiOk({ items: [latest, assessment], total: 2 }),
    );

    const { container } = render(
      await AssessmentsListPage({ params: Promise.resolve({ id: 'student-1' }) }),
    );

    expect(screen.getByRole('table', { name: 'Comparação de avaliações' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Evolução de peso e percentual de gordura' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Foto de progresso de 15/05/2026' })).toHaveAttribute(
      'src',
      'https://cdn.test/front.jpg',
    );
    expect(container.querySelector('[data-responsive-layout="assessment-history"]')).toBeTruthy();
  });
});
