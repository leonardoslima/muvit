import type { Client } from '@/lib/api/client/types.gen';
import {
  getStudents,
  getStudentsByStudentIdWorkoutLogs,
  getStudentsByStudentIdWorkoutPlans,
} from '@/lib/api/sdk.gen';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadDashboardStudentList } from './dashboard-student-list';

vi.mock('@/lib/api/sdk.gen', () => ({
  getStudents: vi.fn(),
  getStudentsByStudentIdWorkoutLogs: vi.fn(),
  getStudentsByStudentIdWorkoutPlans: vi.fn(),
}));

const client = {} as Client;

const student = {
  id: 'student-1',
  trainerId: 'trainer-1',
  isIndependent: false,
  name: 'Ana Lima',
  email: 'ana@example.com',
  phone: null,
  birthDate: null,
  gender: 'female' as const,
  goals: null,
  trainingDays: null,
  restrictions: null,
  status: 'active' as const,
  avatarUrl: null,
  expoPushToken: null,
  createdAt: '2026-06-20T00:00:00.000Z',
};

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
    response: new Response(null, { status: 503 }),
  };
}

function mockDetails() {
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
          status: 'active' as const,
          createdAt: '2026-06-20T00:00:00.000Z',
          days: [],
        },
      ],
    }),
  );
}

describe('loadDashboardStudentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna erro recuperável em 503 sem inventar contagem', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiError());

    const state = await loadDashboardStudentList(client);

    expect(state).toEqual({
      status: 'error',
      message: 'Não foi possível carregar a lista de alunos.',
      rows: [],
      total: 0,
      pageSize: 5,
    });
  });

  it('retorna erro quando a chamada rejeita por falha de transporte', async () => {
    vi.mocked(getStudents).mockRejectedValue(new Error('network down'));

    const state = await loadDashboardStudentList(client);

    expect(state.status).toBe('error');
  });

  it('mantém carteira vazia real e não busca detalhes', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [], total: 0 }));

    const state = await loadDashboardStudentList(client);

    expect(state).toEqual({ status: 'ready', rows: [], total: 0, pageSize: 5 });
    expect(getStudentsByStudentIdWorkoutLogs).not.toHaveBeenCalled();
    expect(getStudentsByStudentIdWorkoutPlans).not.toHaveBeenCalled();
  });

  it('monta linhas reais preservando o limite 5', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student], total: 1 }));
    mockDetails();

    const state = await loadDashboardStudentList(client);

    expect(getStudents).toHaveBeenCalledWith({ client, query: { limit: 5 } });
    expect(state).toMatchObject({ status: 'ready', total: 1, pageSize: 5 });
    if (state.status !== 'ready') throw new Error('estado deveria ser ready');
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]).toMatchObject({
      id: 'student-1',
      name: 'Ana Lima',
      href: '/students/student-1',
      statusLabel: 'Ativo',
      currentPlan: 'Hipertrofia A/B',
      lastWorkout: '20 jun 2026',
    });
  });

  it('retorna erro quando os detalhes de um aluno falham', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student], total: 1 }));
    vi.mocked(getStudentsByStudentIdWorkoutLogs).mockResolvedValue(apiError());
    vi.mocked(getStudentsByStudentIdWorkoutPlans).mockResolvedValue(apiOk({ items: [] }));

    const state = await loadDashboardStudentList(client);

    expect(state.status).toBe('error');
  });
});
