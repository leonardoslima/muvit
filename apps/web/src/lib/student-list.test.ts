import type { Client } from '@/lib/api/client/types.gen';
import { getStudents } from '@/lib/api/sdk.gen';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadStudentList } from './student-list';

vi.mock('@/lib/api/sdk.gen', () => ({ getStudents: vi.fn() }));

const client = {} as Client;

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

describe('loadStudentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna erro quando a API responde 503 com error e sem data', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiError());

    const state = await loadStudentList(client, {});

    expect(state).toEqual({
      status: 'error',
      message: 'Não foi possível carregar a lista de alunos.',
    });
  });

  it('retorna erro quando a resposta não traz data nem error', async () => {
    vi.mocked(getStudents).mockResolvedValue({
      data: undefined,
      error: undefined,
      request: new Request('https://api.test'),
      response: new Response(null, { status: 200 }),
    });

    const state = await loadStudentList(client, {});

    expect(state.status).toBe('error');
  });

  it('retorna erro quando a chamada rejeita por falha de transporte', async () => {
    vi.mocked(getStudents).mockRejectedValue(new Error('network down'));

    const state = await loadStudentList(client, {});

    expect(state).toEqual({
      status: 'error',
      message: 'Não foi possível carregar a lista de alunos.',
    });
  });

  it('retorna os alunos e o total reais no sucesso', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student], total: 1 }));

    const state = await loadStudentList(client, {});

    expect(state).toEqual({ status: 'ready', items: [student], total: 1 });
  });

  it('distingue carteira genuinamente vazia de erro', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [], total: 0 }));

    const state = await loadStudentList(client, {});

    expect(state).toEqual({ status: 'ready', items: [], total: 0 });
  });

  it('encaminha q, status e limit 50 usando o mesmo cliente recebido', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [], total: 0 }));

    await loadStudentList(client, { q: 'Ana Lima', status: 'active' });

    expect(getStudents).toHaveBeenCalledWith({
      client,
      query: { q: 'Ana Lima', status: 'active', limit: 50 },
    });
  });
});
