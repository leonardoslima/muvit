import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiRequester } from '../lib/api';
import { QueueDrain } from './queue-drain';

const authState = vi.hoisted(() => ({
  session: {
    data: { user: { id: 'user-a' } } as { user: { id: string } } | null,
  },
  useSession: vi.fn(),
}));

const apiState = vi.hoisted(() => ({
  bindCurrentSession: vi.fn<() => ApiRequester>(),
}));

const journalState = vi.hoisted(() => ({
  ensure: vi.fn(),
  get: vi.fn(),
  hasForDay: vi.fn(),
  drain: vi.fn<(ownerAuthUserId: string, bindRequester: () => ApiRequester) => Promise<void>>(),
  removeTerminal:
    vi.fn<(ownerAuthUserId: string, date: string, workoutDayId: string) => Promise<void>>(),
}));

const appState = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('react-native', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    AppState: { addEventListener: appState.addEventListener },
  };
});

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('../lib/auth-client', () => ({
  authClient: { useSession: authState.useSession },
}));

vi.mock('../lib/log-queue', () => ({
  createWorkoutLogJournal: () => journalState,
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolvePromise = (): void => undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

describe('QueueDrain', () => {
  beforeEach(() => {
    authState.session.data = { user: { id: 'user-a' } };
    authState.useSession.mockReturnValue(authState.session);
    appState.addEventListener.mockReturnValue({ remove: appState.remove });
    journalState.drain.mockResolvedValue(undefined);
    journalState.removeTerminal.mockResolvedValue(undefined);
  });

  it('drena com o requester capturado sem reconciliar tombstones automaticamente', async () => {
    const drainGate = deferred();
    const requesterA = { request: vi.fn() };
    const requesterB = { request: vi.fn() };
    journalState.removeTerminal.mockRejectedValue(new Error('não deve reconciliar'));
    journalState.drain.mockReturnValue(drainGate.promise);
    apiState.bindCurrentSession.mockReturnValue(requesterA);

    render(<QueueDrain />);

    expect(apiState.bindCurrentSession).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(journalState.drain).toHaveBeenCalledTimes(1));
    expect(journalState.removeTerminal).not.toHaveBeenCalled();

    apiState.bindCurrentSession.mockReturnValue(requesterB);
    const bindRequester = journalState.drain.mock.calls[0]?.[1];
    expect(bindRequester?.()).toBe(requesterA);
    expect(apiState.bindCurrentSession).toHaveBeenCalledTimes(1);
    drainGate.resolve();
  });
});
