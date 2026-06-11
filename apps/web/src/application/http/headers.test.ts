import { describe, expect, it } from 'vitest';
import { headersFromConfig } from './headers';

describe('headersFromConfig', () => {
  it('copies headers from Headers', () => {
    const source = new Headers({ authorization: 'Bearer token' });
    const headers = headersFromConfig(source);

    expect(headers.get('authorization')).toBe('Bearer token');
  });

  it('copies headers from array and object values', () => {
    const fromArray = headersFromConfig([['x-app', 'muvit']]);
    const fromObject = headersFromConfig({ authorization: 'Bearer token', ignored: 10 });

    expect(fromArray.get('x-app')).toBe('muvit');
    expect(fromObject.get('authorization')).toBe('Bearer token');
    expect(fromObject.has('ignored')).toBe(false);
  });
});
