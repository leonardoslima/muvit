import { describe, expect, it, vi } from 'vitest';
import { type PushTokenApiClient, registerPushToken } from './push-token';

describe('registerPushToken', () => {
  it('requests permission, obtains Expo token and registers it in the API', async () => {
    const api = {
      request: vi.fn<PushTokenApiClient['request']>().mockResolvedValue(undefined),
    };

    await registerPushToken({
      api,
      getPermissions: async () => ({ status: 'undetermined' }),
      requestPermissions: async () => ({ status: 'granted' }),
      getExpoPushToken: async () => ({ data: 'ExponentPushToken[abc123]' }),
    });

    expect(api.request).toHaveBeenCalledWith('/students/me/push-token', {
      method: 'POST',
      body: JSON.stringify({ token: 'ExponentPushToken[abc123]' }),
    });
  });

  it('registers immediately when permission is already granted', async () => {
    const api = {
      request: vi.fn<PushTokenApiClient['request']>().mockResolvedValue(undefined),
    };
    const requestPermissions = vi.fn();

    await registerPushToken({
      api,
      getPermissions: async () => ({ status: 'granted' }),
      requestPermissions,
      getExpoPushToken: async () => ({ data: 'ExponentPushToken[ready]' }),
    });

    expect(requestPermissions).not.toHaveBeenCalled();
    expect(api.request).toHaveBeenCalledWith('/students/me/push-token', {
      method: 'POST',
      body: JSON.stringify({ token: 'ExponentPushToken[ready]' }),
    });
  });

  it('does not register when permission is denied', async () => {
    const api = {
      request: vi.fn<PushTokenApiClient['request']>().mockResolvedValue(undefined),
    };

    await registerPushToken({
      api,
      getPermissions: async () => ({ status: 'undetermined' }),
      requestPermissions: async () => ({ status: 'denied' }),
      getExpoPushToken: async () => ({ data: 'ExponentPushToken[denied]' }),
    });

    expect(api.request).not.toHaveBeenCalled();
  });
});
