import { beforeEach, describe, expect, it, vi } from 'vitest';
import { headersFromConfig } from '../application/http/headers';

const mocks = vi.hoisted(() => ({ headers: vi.fn() }));

vi.mock('next/headers', () => ({ headers: mocks.headers }));

import { configureServerClient } from './api-client';

describe('configureServerClient', () => {
  beforeEach(() => {
    mocks.headers.mockReset();
  });

  it('encaminha o Cookie integral e nao cria Authorization Bearer', async () => {
    const cookie = 'muvit.session_token=session-token; theme=dark';
    mocks.headers.mockResolvedValue(new Headers({ cookie }));

    const configuredClient = await configureServerClient();
    const configHeaders = headersFromConfig(configuredClient.getConfig().headers);

    expect(configHeaders.get('cookie')).toBe(cookie);
    expect(configHeaders.has('authorization')).toBe(false);
    expect(configuredClient.getConfig().credentials).toBe('include');
  });
});
