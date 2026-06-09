import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from './config-url';

describe('resolveApiUrl', () => {
  it('keeps localhost for web', () => {
    expect(resolveApiUrl('http://localhost:3333', '192.168.0.10:8081', 'web')).toBe(
      'http://localhost:3333',
    );
  });

  it('uses the Expo LAN host on native when env points to localhost', () => {
    expect(resolveApiUrl('http://localhost:3333', '192.168.0.10:8081', 'ios')).toBe(
      'http://192.168.0.10:3333',
    );
  });

  it('uses the Expo debugger host on native when hostUri is unavailable', () => {
    expect(resolveApiUrl('http://localhost:3333', '192.168.0.10:19000', 'android')).toBe(
      'http://192.168.0.10:3333',
    );
  });

  it('supports 127.0.0.1 env URLs on native', () => {
    expect(resolveApiUrl('http://127.0.0.1:3333', '192.168.0.10:8081', 'android')).toBe(
      'http://192.168.0.10:3333',
    );
  });

  it('preserves explicit non-local API URLs on native', () => {
    expect(resolveApiUrl('http://10.0.0.2:3333', '192.168.0.10:8081', 'android')).toBe(
      'http://10.0.0.2:3333',
    );
  });
});
