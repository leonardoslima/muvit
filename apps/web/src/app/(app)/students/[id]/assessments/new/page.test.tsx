import { getStudentsById } from '@/lib/api/sdk.gen';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NewAssessmentPage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({ getStudentsById: vi.fn() }));
vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('../_form', () => ({
  AssessmentForm: ({ studentId }: { studentId: string }) => (
    <div data-testid="assessment-form">{studentId}</div>
  ),
}));

function apiOk<T>(data: T) {
  return {
    data,
    error: undefined,
    request: new Request('https://api.test'),
    response: new Response(null, { status: 200 }),
  };
}

describe('NewAssessmentPage', () => {
  it('renderiza o contexto do aluno e a navegação definidos no Pencil', async () => {
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
        trainingDays: null,
        restrictions: null,
        status: 'active',
        avatarUrl: null,
        expoPushToken: null,
        createdAt: '2026-07-17T00:00:00.000Z',
      }),
    );

    const { container } = render(
      await NewAssessmentPage({ params: Promise.resolve({ id: 'student-1' }) }),
    );

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alunos' })).toHaveAttribute('href', '/students');
    expect(screen.getByRole('heading', { name: 'Ana Lima' })).toBeInTheDocument();
    expect(screen.getAllByText('Avaliação física')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Voltar ao perfil' })).toHaveAttribute(
      'href',
      '/students/student-1',
    );
    expect(screen.getByRole('link', { name: 'Registrar nova avaliação' })).toHaveAttribute(
      'href',
      '/students/student-1/assessments/new',
    );
    expect(screen.getByRole('link', { name: 'Histórico de avaliações' })).toHaveAttribute(
      'href',
      '/students/student-1/assessments',
    );
    expect(screen.getByTestId('assessment-form')).toHaveTextContent('student-1');
    expect(container.querySelector('[data-responsive-layout="new-assessment"]')).toBeTruthy();
  });
});
