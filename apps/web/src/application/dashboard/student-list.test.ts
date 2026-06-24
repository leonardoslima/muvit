import { describe, expect, it } from 'vitest';
import { buildDashboardStudentListRow, formatDashboardStudentDate } from './student-list';

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
  restrictions: null,
  status: 'active' as const,
  avatarUrl: null,
  expoPushToken: null,
  createdAt: '2026-06-20T00:00:00.000Z',
};

describe('dashboard student list model', () => {
  it('formata a data compacta em pt-BR sem deslocar o dia pelo fuso', () => {
    expect(formatDashboardStudentDate('2026-06-20')).toBe('20 jun 2026');
  });

  it('monta a linha com plano ativo, ultimo treino e status em pt-BR', () => {
    expect(
      buildDashboardStudentListRow({
        student,
        workoutLogs: [{ date: '2026-06-20' }],
        workoutPlans: [
          { name: 'Rascunho', status: 'draft' },
          { name: 'Hipertrofia A/B', status: 'active' },
        ],
      }),
    ).toMatchObject({
      id: 'student-1',
      name: 'Ana Lima',
      href: '/students/student-1',
      status: 'active',
      statusLabel: 'Ativo',
      currentPlan: 'Hipertrofia A/B',
      lastWorkout: '20 jun 2026',
    });
  });

  it('usa fallbacks claros quando ainda nao ha treino nem plano', () => {
    expect(
      buildDashboardStudentListRow({
        student: { ...student, status: 'paused' },
        workoutLogs: [],
        workoutPlans: [],
      }),
    ).toMatchObject({
      statusLabel: 'Pausado',
      currentPlan: 'Sem plano',
      lastWorkout: 'Sem treino',
    });
  });
});
