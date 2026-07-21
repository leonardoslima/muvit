import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  configureServerClient: vi.fn(),
  postTrainersOnboarding: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  configureServerClient: mocks.configureServerClient,
}));

vi.mock('@/lib/api/sdk.gen', () => ({
  postTrainersOnboarding: mocks.postTrainersOnboarding,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

import { completeOnboardingAction } from './actions';

describe('completeOnboardingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa o endpoint gerado de onboarding com o cliente autenticado', async () => {
    const client = { getConfig: () => ({ baseUrl: 'http://api.test' }) };
    mocks.configureServerClient.mockResolvedValue(client);
    mocks.postTrainersOnboarding.mockResolvedValue({
      data: { onboardedAt: '2026-07-20T10:00:00.000Z' },
      error: undefined,
    });

    await completeOnboardingAction();

    expect(mocks.postTrainersOnboarding).toHaveBeenCalledWith({ client });
    expect(mocks.redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('preserva a mensagem de erro quando o onboarding falha', async () => {
    mocks.configureServerClient.mockResolvedValue({});
    mocks.postTrainersOnboarding.mockResolvedValue({
      data: undefined,
      error: { error: 'unauthorized' },
    });

    await expect(completeOnboardingAction()).rejects.toThrow('Falha ao concluir onboarding.');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
