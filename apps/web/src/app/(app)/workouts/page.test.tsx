import { getExercises, getStudents } from '@/lib/api/sdk.gen';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkoutsLayout from './layout';
import WorkoutsPage from './page';

vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({ getStudents: vi.fn(), getExercises: vi.fn() }));

const studentItems = [
  {
    id: 'student-1',
    trainerId: 'trainer-1',
    isIndependent: false,
    name: 'Ana Lima',
    email: 'ana@muvit.test',
    phone: null,
    birthDate: null,
    gender: 'female' as const,
    goals: null,
    trainingDays: null,
    restrictions: null,
    status: 'active' as const,
    avatarUrl: null,
    expoPushToken: null,
    createdAt: '2026-08-10T12:00:00.000Z',
    internalNotes: null,
  },
  {
    id: 'student-2',
    trainerId: 'trainer-1',
    isIndependent: false,
    name: 'Bruno Luz',
    email: null,
    phone: null,
    birthDate: null,
    gender: 'male' as const,
    goals: null,
    trainingDays: null,
    restrictions: null,
    status: 'active' as const,
    avatarUrl: null,
    expoPushToken: null,
    createdAt: '2026-08-10T12:00:00.000Z',
    internalNotes: null,
  },
];

const request = new Request('http://localhost');
const response = new Response();

describe('WorkoutsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStudents).mockResolvedValue({
      data: { items: studentItems, total: 2 },
      request,
      response,
    });
    vi.mocked(getExercises).mockResolvedValue({
      data: {
        items: [
          {
            id: 'exercise-1',
            trainerId: null,
            name: 'Supino reto',
            muscleGroup: 'chest',
            equipment: 'Barra',
            videoUrl: null,
            instructions: null,
            createdAt: '2026-08-10T12:00:00.000Z',
          },
        ],
        total: 1,
        facets: { equipment: ['Barra'] },
      },
      request,
      response,
    });
  });

  it('carrega o construtor canônico em full-height e respeita o aluno da URL', async () => {
    render(
      <WorkoutsLayout>
        {await WorkoutsPage({ searchParams: Promise.resolve({ studentId: 'student-2' }) })}
      </WorkoutsLayout>,
    );

    expect(screen.getByRole('main', { name: 'Construtor de treino' })).toBeInTheDocument();
    expect(screen.getByLabelText('Aluno')).toHaveValue('student-2');
    expect(
      screen.getByRole('main', { name: 'Construtor de treino' }).parentElement,
    ).toHaveAttribute('data-app-content', 'full-height');
    expect(getStudents).toHaveBeenCalledWith({
      client: expect.anything(),
      query: { limit: 100, status: 'active' },
    });
    expect(getExercises).toHaveBeenCalledWith({
      client: expect.anything(),
      query: { limit: 100, scope: 'all' },
    });
  });

  it('usa o primeiro aluno ativo quando o parâmetro não corresponde à lista', async () => {
    render(
      await WorkoutsPage({ searchParams: Promise.resolve({ studentId: 'student-inexistente' }) }),
    );

    expect(screen.getByLabelText('Aluno')).toHaveValue('student-1');
  });
});
