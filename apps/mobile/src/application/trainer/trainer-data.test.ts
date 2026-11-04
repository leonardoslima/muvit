import { describe, expect, it, vi } from 'vitest';
import {
  TRAINER_STUDENTS_PAGE_SIZE,
  getTrainerStudent,
  getTrainerSummary,
  listTrainerStudents,
} from './trainer-data';

describe('trainer-data', () => {
  it('carrega o resumo do treinador sem enviar ownership pelo cliente', async () => {
    const request = vi.fn().mockResolvedValue({
      students: { total: 3, active: 2, paused: 1, inactive: 0, newThisWeek: 1 },
      workouts: { activePlans: 2 },
      assessments: { last30d: 4 },
    });

    await getTrainerSummary({ request });

    expect(request).toHaveBeenCalledWith('/trainer/summary', { signal: undefined });
  });

  it('encaminha o signal ao carregar o resumo do treinador', async () => {
    const request = vi.fn().mockResolvedValue({
      students: { total: 0, active: 0, paused: 0, inactive: 0, newThisWeek: 0 },
      workouts: { activePlans: 0 },
      assessments: { last30d: 0 },
    });
    const controller = new AbortController();

    await getTrainerSummary({ request }, controller.signal);

    expect(request).toHaveBeenCalledWith('/trainer/summary', {
      signal: controller.signal,
    });
  });

  it('lista alunos com paginação e sem q quando a busca está vazia', async () => {
    const request = vi.fn().mockResolvedValue({ items: [], total: 0 });

    await listTrainerStudents(
      { request },
      { q: '   ', limit: TRAINER_STUDENTS_PAGE_SIZE, offset: 25 },
    );

    expect(request).toHaveBeenCalledWith('/students?limit=25&offset=25', {
      signal: undefined,
    });
    expect(request.mock.calls[0]?.[0]).not.toContain('trainerId');
    expect(request.mock.calls[0]?.[0]).not.toContain('status');
    expect(request.mock.calls[0]?.[0]).not.toContain('assessment');
    expect(request.mock.calls[0]?.[0]).not.toContain('workout');
  });

  it('normaliza, codifica e encaminha a busca por nome e o signal', async () => {
    const request = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const controller = new AbortController();

    await listTrainerStudents(
      { request },
      {
        q: '  Ana Júlia  ',
        limit: TRAINER_STUDENTS_PAGE_SIZE,
        offset: 0,
        signal: controller.signal,
      },
    );

    expect(request).toHaveBeenCalledWith('/students?q=Ana%20J%C3%BAlia&limit=25&offset=0', {
      signal: controller.signal,
    });
  });

  it('carrega um aluno pelo id e encaminha o signal', async () => {
    const request = vi.fn().mockResolvedValue({ id: 'student-id' });
    const controller = new AbortController();

    await getTrainerStudent({ request }, 'student-id', controller.signal);

    expect(request).toHaveBeenCalledWith('/students/student-id', {
      signal: controller.signal,
    });
  });
});
