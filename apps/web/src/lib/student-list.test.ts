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

const secondStudent = {
  ...student,
  id: 'student-2',
  name: 'Bia Souza',
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

  it('retorna os alunos, o total e a página efetiva no sucesso sem filtros', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student], total: 1 }));

    const state = await loadStudentList(client, {});

    expect(state).toEqual({
      status: 'ready',
      items: [student],
      total: 1,
      portfolioTotal: 1,
      page: 1,
      pageSize: 50,
    });
    expect(getStudents).toHaveBeenCalledTimes(1);
  });

  it('distingue carteira genuinamente vazia de erro', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [], total: 0 }));

    const state = await loadStudentList(client, {});

    expect(state).toEqual({
      status: 'ready',
      items: [],
      total: 0,
      portfolioTotal: 0,
      page: 1,
      pageSize: 50,
    });
  });

  it('encaminha q, status, limit 50 e offset da página sem enviar page', async () => {
    vi.mocked(getStudents)
      .mockResolvedValueOnce(apiOk({ items: [student, secondStudent], total: 52 }))
      .mockResolvedValueOnce(apiOk({ items: [], total: 52 }));

    const state = await loadStudentList(client, {
      q: 'Ana Lima',
      status: 'paused',
      page: 2,
    });

    expect(vi.mocked(getStudents).mock.calls[0]?.[0]).toEqual({
      client,
      query: { q: 'Ana Lima', status: 'paused', limit: 50, offset: 50 },
    });
    expect(state).toMatchObject({ status: 'ready', total: 52, portfolioTotal: 52, page: 2 });
  });

  it('busca o total global em consulta própria quando há filtro', async () => {
    vi.mocked(getStudents)
      .mockResolvedValueOnce(apiOk({ items: [student, secondStudent], total: 2 }))
      .mockResolvedValueOnce(apiOk({ items: [], total: 52 }));

    const state = await loadStudentList(client, { q: 'Ana' });

    expect(getStudents).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getStudents).mock.calls[1]?.[0]).toEqual({
      client,
      query: { limit: 1, offset: 0 },
    });
    expect(state).toMatchObject({ status: 'ready', total: 2, portfolioTotal: 52, page: 1 });
  });

  it('não repete a consulta global quando não há busca nem status', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student], total: 52 }));

    const state = await loadStudentList(client, { page: 1 });

    expect(getStudents).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getStudents).mock.calls[0]?.[0]).toEqual({
      client,
      query: { q: undefined, status: undefined, limit: 50, offset: 0 },
    });
    expect(state).toMatchObject({ total: 52, portfolioTotal: 52 });
  });

  it('retorna erro se a consulta do total global falhar', async () => {
    vi.mocked(getStudents)
      .mockResolvedValueOnce(apiOk({ items: [student], total: 1 }))
      .mockResolvedValueOnce(apiError());

    const state = await loadStudentList(client, { status: 'active' });

    expect(state.status).toBe('error');
  });

  it('limita página acima do último resultado e reconsulta uma vez', async () => {
    vi.mocked(getStudents)
      .mockResolvedValueOnce(apiOk({ items: [], total: 52 }))
      .mockResolvedValueOnce(apiOk({ items: [student, secondStudent], total: 52 }));

    const state = await loadStudentList(client, { page: 999 });

    expect(getStudents).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getStudents).mock.calls[0]?.[0]).toEqual({
      client,
      query: { q: undefined, status: undefined, limit: 50, offset: 49900 },
    });
    expect(vi.mocked(getStudents).mock.calls[1]?.[0]).toEqual({
      client,
      query: { q: undefined, status: undefined, limit: 50, offset: 50 },
    });
    expect(state).toMatchObject({ status: 'ready', page: 2, total: 52, portfolioTotal: 52 });
  });

  it('mantém página 1 sem reconsulta quando a carteira está vazia', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [], total: 0 }));

    const state = await loadStudentList(client, { page: 999 });

    expect(getStudents).toHaveBeenCalledTimes(1);
    expect(state).toMatchObject({ status: 'ready', page: 1, total: 0, items: [] });
  });

  it('encerra sem terceira consulta quando a página limitada esvazia por exclusão concorrente', async () => {
    vi.mocked(getStudents)
      .mockResolvedValueOnce(apiOk({ items: [], total: 52 }))
      .mockResolvedValueOnce(apiOk({ items: [], total: 0 }));

    const state = await loadStudentList(client, { page: 999 });

    expect(getStudents).toHaveBeenCalledTimes(2);
    expect(state).toMatchObject({
      status: 'ready',
      page: 1,
      items: [],
      total: 0,
      portfolioTotal: 0,
    });
  });

  it('normaliza página inválida recebida diretamente pelo loader', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student], total: 1 }));

    const state = await loadStudentList(client, { page: 1.5 });

    expect(vi.mocked(getStudents).mock.calls[0]?.[0]).toEqual({
      client,
      query: { q: undefined, status: undefined, limit: 50, offset: 0 },
    });
    expect(state).toMatchObject({ page: 1 });
  });

  it('nunca envia offset não seguro para a API', async () => {
    vi.mocked(getStudents).mockResolvedValue(apiOk({ items: [student], total: 1 }));

    const state = await loadStudentList(client, { page: 180143985094821 });

    expect(vi.mocked(getStudents).mock.calls[0]?.[0]).toEqual({
      client,
      query: { q: undefined, status: undefined, limit: 50, offset: 0 },
    });
    expect(state).toMatchObject({ page: 1 });
  });
});
