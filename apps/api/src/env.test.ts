import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadApiHost(apiHost: string | undefined): Promise<string> {
  vi.resetModules();
  vi.stubEnv('API_HOST', apiHost);

  const { env } = await import('./env.js');
  return env.API_HOST;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('API_HOST environment validation', () => {
  it('uses the IPv4 wildcard when API_HOST is missing', async () => {
    await expect(loadApiHost(undefined)).resolves.toBe('0.0.0.0');
  });

  it('accepts an IPv4 address', async () => {
    await expect(loadApiHost('192.0.2.10')).resolves.toBe('192.0.2.10');
  });

  it('accepts an IPv6 address', async () => {
    await expect(loadApiHost('2001:db8::10')).resolves.toBe('2001:db8::10');
  });

  it('rejects a hostname', async () => {
    await expect(loadApiHost('api.example.test')).rejects.toMatchObject({
      issues: expect.arrayContaining([expect.objectContaining({ path: ['API_HOST'] })]),
    });
  });
});
