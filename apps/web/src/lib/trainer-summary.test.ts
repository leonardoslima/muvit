import type { Client } from '@/lib/api/client/types.gen';
import { getTrainerSummary } from '@/lib/api/sdk.gen';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTrainerSummary } from './trainer-summary';

vi.mock('@/lib/api/sdk.gen', () => ({ getTrainerSummary: vi.fn() }));

const client = {} as Client;

const summary = {
  students: {
    total: 3,
    active: 2,
    paused: 1,
    inactive: 0,
    newThisWeek: 1,
    inactive7d: 0,
  },
  workouts: { activePlans: 2, expiringThisWeek: 1 },
  assessments: { last30d: 1, pending: 0 },
};

const emptySummary = {
  students: { total: 0, active: 0, paused: 0, inactive: 0, newThisWeek: 0, inactive7d: 0 },
  workouts: { activePlans: 0, expiringThisWeek: 0 },
  assessments: { last30d: 0, pending: 0 },
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

describe('loadTrainerSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna erro quando a API responde 503 com error e sem data', async () => {
    vi.mocked(getTrainerSummary).mockResolvedValue(apiError());

    const state = await loadTrainerSummary(client);

    expect(state).toEqual({
      status: 'error',
      message: 'Não foi possível carregar os indicadores.',
    });
  });

  it('retorna erro quando a resposta não traz data nem error', async () => {
    vi.mocked(getTrainerSummary).mockResolvedValue({
      data: undefined,
      error: undefined,
      request: new Request('https://api.test'),
      response: new Response(null, { status: 200 }),
    });

    const state = await loadTrainerSummary(client);

    expect(state.status).toBe('error');
  });

  it('retorna erro quando a chamada rejeita por falha de transporte', async () => {
    vi.mocked(getTrainerSummary).mockRejectedValue(new Error('network down'));

    const state = await loadTrainerSummary(client);

    expect(state).toEqual({
      status: 'error',
      message: 'Não foi possível carregar os indicadores.',
    });
  });

  it('retorna o resumo real no sucesso', async () => {
    vi.mocked(getTrainerSummary).mockResolvedValue(apiOk(summary));

    const state = await loadTrainerSummary(client);

    expect(state).toEqual({ status: 'ready', data: summary });
    expect(getTrainerSummary).toHaveBeenCalledWith({ client });
  });

  it('distingue zeros reais de indisponibilidade', async () => {
    vi.mocked(getTrainerSummary).mockResolvedValue(apiOk(emptySummary));

    const state = await loadTrainerSummary(client);

    expect(state).toEqual({ status: 'ready', data: emptySummary });
  });
});
