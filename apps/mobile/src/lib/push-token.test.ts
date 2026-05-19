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
});
