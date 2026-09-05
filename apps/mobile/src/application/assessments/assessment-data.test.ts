import { describe, expect, it, vi } from 'vitest';
import {
  TRAINER_ASSESSMENTS_PAGE_SIZE,
  createAssessment,
  getAssessment,
  listAssessments,
} from './assessment-data';

describe('assessment data', () => {
  it('lista avaliações do próprio aluno', async () => {
    const api = {
      request: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    await listAssessments(api, { kind: 'self' }, { limit: 20, offset: 0 });

    expect(api.request).toHaveBeenCalledWith('/students/me/assessments?limit=20&offset=0', {
      signal: undefined,
    });
  });

  it('lista avaliações de um aluno do treinador com paginação', async () => {
    const api = {
      request: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const signal = new AbortController().signal;

    await listAssessments(
      api,
      { kind: 'student', studentId: 'student-1' },
      { limit: TRAINER_ASSESSMENTS_PAGE_SIZE, offset: 25, signal },
    );

    expect(api.request).toHaveBeenCalledWith('/students/student-1/assessments?limit=25&offset=25', {
      signal,
    });
  });

  it('obtém uma avaliação pelo id', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'assessment-1' }) };
    const signal = new AbortController().signal;

    await getAssessment(api, 'assessment-1', signal);

    expect(api.request).toHaveBeenCalledWith('/assessments/assessment-1', { signal });
  });

  it('cria avaliação para aluno do treinador', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'assessment-1' }) };

    await createAssessment(
      api,
      { kind: 'student', studentId: 'student-1' },
      { date: '2026-09-03', weightKg: 82.5 },
    );

    expect(api.request).toHaveBeenCalledWith('/students/student-1/assessments', {
      method: 'POST',
      body: JSON.stringify({ date: '2026-09-03', weightKg: 82.5 }),
    });
  });

  it('cria avaliação self sem enviar trainerId', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'assessment-1' }) };

    await createAssessment(api, { kind: 'self' }, { date: '2026-09-03' });

    expect(api.request).toHaveBeenCalledWith('/students/me/assessments', {
      method: 'POST',
      body: JSON.stringify({ date: '2026-09-03' }),
    });
    expect(JSON.stringify(api.request.mock.calls)).not.toContain('trainerId');
  });
});
