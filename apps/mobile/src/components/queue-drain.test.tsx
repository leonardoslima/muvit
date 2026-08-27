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
  pruneTerminalsBefore: vi.fn<(ownerAuthUserId: string, date: string) => Promise<void>>(),
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

vi.mock('../lib/date', () => ({
  todayIsoDate: () => '2026-08-27',
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
    journalState.pruneTerminalsBefore.mockResolvedValue(undefined);
  });

  it('captura requester e owner antes de aguardar a poda', async () => {
    const pruneGate = deferred();
    const requesterA = { request: vi.fn() };
    const requesterB = { request: vi.fn() };
    journalState.pruneTerminalsBefore.mockReturnValue(pruneGate.promise);
    apiState.bindCurrentSession.mockReturnValue(requesterA);

    render(<QueueDrain />);

    expect(journalState.pruneTerminalsBefore).toHaveBeenCalledWith('user-a', '2026-08-27');
    expect(apiState.bindCurrentSession).toHaveBeenCalledTimes(1);

    apiState.bindCurrentSession.mockReturnValue(requesterB);
    pruneGate.resolve();

    await waitFor(() => expect(journalState.drain).toHaveBeenCalledTimes(1));
    const bindRequester = journalState.drain.mock.calls[0]?.[1];
    expect(bindRequester?.()).toBe(requesterA);
    expect(apiState.bindCurrentSession).toHaveBeenCalledTimes(1);
  });
});
